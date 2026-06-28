import {
  FieldValue,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
  type WriteBatch,
} from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebaseAdmin";
import { refreshLeaderboardTop5 } from "@/lib/leaderboard";
import {
  dedupeStudentsByStudentId,
  type StudentSummary,
} from "@/lib/studentsAdminShared";
import {
  normalizeStudentId,
  parseStudentId,
} from "@/lib/studentId";

type MergedStudentProfile = {
  uid: string;
  name: string;
  class: string;
  number: string;
  totalPoints: number;
  visitedBooths: string[];
  lastLogin: ReturnType<typeof FieldValue.serverTimestamp>;
  lastSeen: ReturnType<typeof FieldValue.serverTimestamp>;
  seededByAdmin?: boolean;
};

function parseLastSeenMs(data: Record<string, unknown>): number | null {
  const lastSeen = data.lastSeen;

  if (
    lastSeen &&
    typeof lastSeen === "object" &&
    "toMillis" in lastSeen &&
    typeof lastSeen.toMillis === "function"
  ) {
    return lastSeen.toMillis();
  }

  return null;
}

function toStudentSummary(doc: QueryDocumentSnapshot): StudentSummary {
  const data = doc.data();
  const lastSeenMs = parseLastSeenMs(data);
  const now = Date.now();

  return {
    authUid: doc.id,
    studentId: typeof data.uid === "string" ? normalizeStudentId(data.uid) : "",
    class: typeof data.class === "string" ? data.class : "",
    number: typeof data.number === "string" ? data.number : "",
    totalPoints:
      typeof data.totalPoints === "number" ? data.totalPoints : 0,
    visitedCount: Array.isArray(data.visitedBooths)
      ? data.visitedBooths.length
      : 0,
    lastSeenMs,
    isOnline: false,
  };
}

export async function findStudentDocsByStudentId(
  studentId: string,
): Promise<QueryDocumentSnapshot[]> {
  const normalized = normalizeStudentId(studentId);
  const snapshot = await getAdminDb().collection("students").get();

  return snapshot.docs.filter((doc) => {
    const uid = doc.data().uid;
    return typeof uid === "string" && normalizeStudentId(uid) === normalized;
  });
}

function mergeStudentDocs(
  docs: DocumentSnapshot[],
  studentId: string,
): MergedStudentProfile {
  const parsed = parseStudentId(studentId);

  if (!parsed) {
    throw new Error("Invalid student ID.");
  }

  let totalPoints = 0;
  const visitedBooths = new Set<string>();
  let name = "";
  let seededByAdmin = false;

  for (const doc of docs) {
    const data = doc.data();

    if (!data) {
      continue;
    }

    totalPoints = Math.max(
      totalPoints,
      typeof data.totalPoints === "number" ? data.totalPoints : 0,
    );

    if (Array.isArray(data.visitedBooths)) {
      for (const boothId of data.visitedBooths) {
        if (typeof boothId === "string" && boothId) {
          visitedBooths.add(boothId);
        }
      }
    }

    if (typeof data.name === "string" && data.name.trim() && !name) {
      name = data.name.trim();
    }

    if (data.seededByAdmin === true) {
      seededByAdmin = true;
    }
  }

  return {
    uid: studentId,
    name,
    class: parsed.class,
    number: parsed.number,
    totalPoints,
    visitedBooths: [...visitedBooths],
    lastLogin: FieldValue.serverTimestamp(),
    lastSeen: FieldValue.serverTimestamp(),
    ...(seededByAdmin ? { seededByAdmin: true } : {}),
  };
}

async function commitBatches(
  writes: Array<(batch: WriteBatch) => void>,
): Promise<void> {
  const db = getAdminDb();

  for (let index = 0; index < writes.length; index += 500) {
    const batch = db.batch();
    const chunk = writes.slice(index, index + 500);

    for (const write of chunk) {
      write(batch);
    }

    await batch.commit();
  }
}

async function updateRelatedAuthUids(
  studentId: string,
  targetAuthUid: string,
): Promise<void> {
  const db = getAdminDb();
  const [visitSnapshot, worksSnapshot] = await Promise.all([
    db.collection("visits").where("studentId", "==", studentId).get(),
    db.collection("studentWorks").where("studentId", "==", studentId).get(),
  ]);

  const writes: Array<(batch: WriteBatch) => void> = [];

  for (const doc of visitSnapshot.docs) {
    if (doc.data().authUid === targetAuthUid) {
      continue;
    }

    writes.push((batch) => {
      batch.update(doc.ref, { authUid: targetAuthUid });
    });
  }

  for (const doc of worksSnapshot.docs) {
    if (doc.data().authUid === targetAuthUid) {
      continue;
    }

    writes.push((batch) => {
      batch.update(doc.ref, { authUid: targetAuthUid });
    });
  }

  await commitBatches(writes);
}

export async function mergeStudentRecordsToTarget(params: {
  studentId: string;
  targetAuthUid: string;
  refreshLeaderboard?: boolean;
}): Promise<{ merged: boolean; duplicatesRemoved: number }> {
  const studentId = normalizeStudentId(params.studentId);
  const parsed = parseStudentId(studentId);

  if (!parsed) {
    throw new Error("Invalid student ID.");
  }

  const matchingDocs = await findStudentDocsByStudentId(studentId);
  const duplicateDocs = matchingDocs.filter(
    (doc) => doc.id !== params.targetAuthUid,
  );

  if (matchingDocs.length === 0) {
    const profile = mergeStudentDocs([], studentId);
    await getAdminDb()
      .collection("students")
      .doc(params.targetAuthUid)
      .set(profile);
    return { merged: true, duplicatesRemoved: 0 };
  }

  if (duplicateDocs.length === 0) {
    const existing = matchingDocs[0];

    if (existing?.id === params.targetAuthUid) {
      await getAdminDb()
        .collection("students")
        .doc(params.targetAuthUid)
        .set(
          {
            lastLogin: FieldValue.serverTimestamp(),
            lastSeen: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      return { merged: false, duplicatesRemoved: 0 };
    }
  }

  const profile = mergeStudentDocs(matchingDocs, studentId);
  const writes: Array<(batch: WriteBatch) => void> = [
    (batch) => {
      batch.set(
        getAdminDb().collection("students").doc(params.targetAuthUid),
        profile,
      );
    },
  ];

  for (const doc of duplicateDocs) {
    writes.push((batch) => {
      batch.delete(doc.ref);
    });
  }

  await commitBatches(writes);
  await updateRelatedAuthUids(studentId, params.targetAuthUid);

  if (duplicateDocs.length > 0 && params.refreshLeaderboard !== false) {
    await refreshLeaderboardTop5();
  }

  return { merged: true, duplicatesRemoved: duplicateDocs.length };
}

export async function resolveStudentSession(params: {
  authUid: string;
  studentId: string;
}): Promise<void> {
  await mergeStudentRecordsToTarget({
    studentId: params.studentId,
    targetAuthUid: params.authUid,
  });
}

export async function dedupeAllStudentRecords(): Promise<number> {
  const snapshot = await getAdminDb().collection("students").get();
  const summaries = snapshot.docs
    .map((doc) => toStudentSummary(doc))
    .filter((student) => student.studentId);

  const grouped = new Map<string, StudentSummary[]>();

  for (const student of summaries) {
    const existing = grouped.get(student.studentId) ?? [];
    existing.push(student);
    grouped.set(student.studentId, existing);
  }

  let duplicatesRemoved = 0;

  for (const [studentId, students] of grouped) {
    if (students.length <= 1) {
      continue;
    }

    const [best] = dedupeStudentsByStudentId(students);

    if (!best) {
      continue;
    }

    const result = await mergeStudentRecordsToTarget({
      studentId,
      targetAuthUid: best.authUid,
      refreshLeaderboard: false,
    });

    duplicatesRemoved += result.duplicatesRemoved;
  }

  if (duplicatesRemoved > 0) {
    await refreshLeaderboardTop5();
  }

  return duplicatesRemoved;
}

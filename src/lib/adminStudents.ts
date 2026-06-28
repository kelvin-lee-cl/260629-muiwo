import { FieldValue, type QueryDocumentSnapshot } from "firebase-admin/firestore";

import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import { refreshLeaderboardTop5 } from "@/lib/leaderboard";
import { findStudentDocsByStudentId } from "@/lib/studentRecords";
import {
  generateStudentIdsForClass,
  isValidClassCode,
  normalizeClassCode,
  normalizeStudentId,
  parseStudentId,
} from "@/lib/studentId";

const SEED_AUTH_UID_PREFIX = "seed-";
export const MAX_STUDENTS_PER_CLASS = 99;
export const MAX_CLASSES_PER_BATCH = 30;
export const MAX_STUDENTS_PER_BATCH = 500;

export type ClassRegistrationInput = {
  classCode: string;
  maxStudents: number;
};

export type BulkRegisterStudentsResult = {
  added: string[];
  skipped: string[];
  invalidClasses: Array<{ classCode: string; reason: string }>;
};

export type DeleteStudentDataResult = {
  studentIds: string[];
  studentsDeleted: number;
  visitsDeleted: number;
  rateLimitsDeleted: number;
  worksDeleted: number;
  authUsersDeleted: number;
};

function seedAuthUid(studentId: string): string {
  return `${SEED_AUTH_UID_PREFIX}${normalizeStudentId(studentId)}`;
}

async function getExistingStudentIds(): Promise<Set<string>> {
  const snapshot = await getAdminDb().collection("students").get();
  const ids = new Set<string>();

  for (const doc of snapshot.docs) {
    const uid = doc.data().uid;

    if (typeof uid === "string" && uid) {
      ids.add(normalizeStudentId(uid));
    }
  }

  return ids;
}

async function commitStudentBatches(
  entries: Array<{ authUid: string; studentId: string }>,
): Promise<void> {
  if (entries.length === 0) {
    return;
  }

  const db = getAdminDb();

  for (let index = 0; index < entries.length; index += 500) {
    const batch = db.batch();
    const chunk = entries.slice(index, index + 500);

    for (const entry of chunk) {
      const parsed = parseStudentId(entry.studentId);

      if (!parsed) {
        continue;
      }

      batch.set(db.collection("students").doc(entry.authUid), {
        uid: entry.studentId,
        name: "",
        class: parsed.class,
        number: parsed.number,
        totalPoints: 0,
        visitedBooths: [],
        lastLogin: FieldValue.serverTimestamp(),
        seededByAdmin: true,
      });
    }

    await batch.commit();
  }
}

function parseMaxStudents(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return null;
  }

  if (value < 1 || value > MAX_STUDENTS_PER_CLASS) {
    return null;
  }

  return value;
}

export function parseClassRegistrationInputs(
  raw: unknown,
): ClassRegistrationInput[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }

  const parsed: ClassRegistrationInput[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      return null;
    }

    const classCode =
      typeof (entry as ClassRegistrationInput).classCode === "string"
        ? (entry as ClassRegistrationInput).classCode
        : "";
    const maxStudents = parseMaxStudents(
      (entry as ClassRegistrationInput).maxStudents,
    );

    if (!classCode || maxStudents === null) {
      return null;
    }

    parsed.push({
      classCode: normalizeClassCode(classCode),
      maxStudents,
    });
  }

  return parsed;
}

export async function bulkRegisterStudentsByClass(
  classes: ClassRegistrationInput[],
): Promise<BulkRegisterStudentsResult> {
  const added: string[] = [];
  const skipped: string[] = [];
  const invalidClasses: Array<{ classCode: string; reason: string }> = [];
  const seenClasses = new Set<string>();
  const existingStudentIds = await getExistingStudentIds();
  const pendingWrites: Array<{ authUid: string; studentId: string }> = [];

  for (const entry of classes) {
    const classCode = normalizeClassCode(entry.classCode);

    if (seenClasses.has(classCode)) {
      invalidClasses.push({
        classCode,
        reason: "Duplicate class in this batch.",
      });
      continue;
    }

    seenClasses.add(classCode);

    if (!isValidClassCode(classCode)) {
      invalidClasses.push({
        classCode,
        reason: "Class must be P1–P6, K2/K3, or grade 1–6 plus one letter (e.g. 1A).",
      });
      continue;
    }

    const studentIds = generateStudentIdsForClass(
      classCode,
      entry.maxStudents,
    );

    for (const studentId of studentIds) {
      if (existingStudentIds.has(studentId)) {
        skipped.push(studentId);
        continue;
      }

      if (!parseStudentId(studentId)) {
        skipped.push(studentId);
        continue;
      }

      pendingWrites.push({
        authUid: seedAuthUid(studentId),
        studentId,
      });
      existingStudentIds.add(studentId);
      added.push(studentId);
    }
  }

  // Firestore-only registration: no Firebase Auth round-trips per student.
  // Real sign-in still uses anonymous auth when the student opens the app.
  await commitStudentBatches(pendingWrites);

  if (added.length > 0) {
    await refreshLeaderboardTop5();
  }

  return { added, skipped, invalidClasses };
}

async function deleteDocumentsInCollection(
  docs: QueryDocumentSnapshot[],
): Promise<number> {
  if (docs.length === 0) {
    return 0;
  }

  const db = getAdminDb();
  let deleted = 0;

  for (let index = 0; index < docs.length; index += 500) {
    const batch = db.batch();
    const chunk = docs.slice(index, index + 500);

    for (const doc of chunk) {
      batch.delete(doc.ref);
      deleted += 1;
    }

    await batch.commit();
  }

  return deleted;
}

async function deleteAuthUsers(authUids: string[]): Promise<number> {
  const auth = getAdminAuth();
  let deleted = 0;

  for (const uid of authUids) {
    try {
      await auth.deleteUser(uid);
      deleted += 1;
    } catch {
      // User may already be gone or belong to another provider.
    }
  }

  return deleted;
}

export async function deleteStudentData(
  studentId: string,
  options?: { refreshLeaderboard?: boolean },
): Promise<DeleteStudentDataResult> {
  const normalized = normalizeStudentId(studentId);

  if (!parseStudentId(normalized)) {
    throw new Error("Invalid student ID.");
  }

  const db = getAdminDb();
  const studentDocs = await findStudentDocsByStudentId(normalized);
  const authUids = studentDocs.map((doc) => doc.id);

  const [visitSnapshot, worksSnapshot] = await Promise.all([
    db.collection("visits").where("studentId", "==", normalized).get(),
    db.collection("studentWorks").where("studentId", "==", normalized).get(),
  ]);

  const [visitsDeleted, worksDeleted] = await Promise.all([
    deleteDocumentsInCollection(visitSnapshot.docs),
    deleteDocumentsInCollection(worksSnapshot.docs),
  ]);

  let rateLimitsDeleted = 0;
  const rateLimitRef = db.collection("rateLimits").doc(normalized);
  const rateLimitDoc = await rateLimitRef.get();

  if (rateLimitDoc.exists) {
    await rateLimitRef.delete();
    rateLimitsDeleted = 1;
  }

  const studentsDeleted = await deleteDocumentsInCollection(studentDocs);
  const authUsersDeleted = await deleteAuthUsers([
    ...authUids,
    seedAuthUid(normalized),
  ]);

  if (studentsDeleted > 0 && options?.refreshLeaderboard !== false) {
    await refreshLeaderboardTop5();
  }

  return {
    studentIds: [normalized],
    studentsDeleted,
    visitsDeleted,
    rateLimitsDeleted,
    worksDeleted,
    authUsersDeleted,
  };
}

export async function deleteClassStudents(
  classCode: string,
): Promise<DeleteStudentDataResult> {
  const normalizedClass = normalizeClassCode(classCode);

  if (!isValidClassCode(normalizedClass)) {
    throw new Error("Invalid class code.");
  }

  const snapshot = await getAdminDb().collection("students").get();
  const studentIds = new Set<string>();

  for (const doc of snapshot.docs) {
    const uid = doc.data().uid;

    if (typeof uid === "string" && normalizeStudentId(uid).startsWith(normalizedClass)) {
      const parsed = parseStudentId(uid);

      if (parsed?.class === normalizedClass) {
        studentIds.add(normalizeStudentId(uid));
      }
    }
  }

  const totals: DeleteStudentDataResult = {
    studentIds: [...studentIds].sort(),
    studentsDeleted: 0,
    visitsDeleted: 0,
    rateLimitsDeleted: 0,
    worksDeleted: 0,
    authUsersDeleted: 0,
  };

  for (const studentId of totals.studentIds) {
    const result = await deleteStudentData(studentId, {
      refreshLeaderboard: false,
    });
    totals.studentsDeleted += result.studentsDeleted;
    totals.visitsDeleted += result.visitsDeleted;
    totals.rateLimitsDeleted += result.rateLimitsDeleted;
    totals.worksDeleted += result.worksDeleted;
    totals.authUsersDeleted += result.authUsersDeleted;
  }

  if (totals.studentsDeleted > 0) {
    await refreshLeaderboardTop5();
  }

  return totals;
}

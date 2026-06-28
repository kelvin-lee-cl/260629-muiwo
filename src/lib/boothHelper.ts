import { FieldValue } from "firebase-admin/firestore";

import { visitDocumentId } from "@/lib/claim";
import type { BoothHelperData, HelperCompletedVisit, HelperStudent } from "@/lib/boothHelperShared";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getBooth } from "@/lib/boothsAdmin";
import { normalizeBoothId } from "@/lib/booths";
import { dedupeStudentsByStudentId, listStudents } from "@/lib/studentsAdmin";
import { normalizeStudentId } from "@/lib/studentId";

function parseTimestampMs(data: Record<string, unknown>): number | null {
  const timestamp = data.timestamp;

  if (
    timestamp &&
    typeof timestamp === "object" &&
    "toMillis" in timestamp &&
    typeof timestamp.toMillis === "function"
  ) {
    return timestamp.toMillis();
  }

  return null;
}

export async function getBoothHelperData(
  boothId: string,
): Promise<BoothHelperData> {
  const normalizedBoothId = normalizeBoothId(boothId);
  const booth = await getBooth(normalizedBoothId);

  if (!booth) {
    throw new Error("Booth not found.");
  }

  const students = dedupeStudentsByStudentId(await listStudents());
  const classByStudentId = new Map(
    students.map((student) => [student.studentId, student.class]),
  );
  const authUidByStudentId = new Map(
    students.map((student) => [student.studentId, student.authUid]),
  );

  const visitSnapshot = await getAdminDb()
    .collection("visits")
    .where("boothId", "==", normalizedBoothId)
    .get();

  const completedVisits: HelperCompletedVisit[] = visitSnapshot.docs
    .map((doc) => {
      const data = doc.data();
      const studentId =
        typeof data.studentId === "string"
          ? normalizeStudentId(data.studentId)
          : "";

      if (!studentId) {
        return null;
      }

      return {
        studentId,
        class: classByStudentId.get(studentId) ?? "",
        authUid:
          typeof data.authUid === "string"
            ? data.authUid
            : authUidByStudentId.get(studentId) ?? "",
        points:
          typeof data.pointsAwarded === "number" ? data.pointsAwarded : 0,
        timestampMs: parseTimestampMs(data),
      };
    })
    .filter((visit): visit is HelperCompletedVisit => visit !== null)
    .sort((left, right) => {
      const leftTime = left.timestampMs ?? 0;
      const rightTime = right.timestampMs ?? 0;
      return rightTime - leftTime;
    });

  const completedStudentIds = new Set(
    completedVisits.map((visit) => visit.studentId),
  );

  const pendingStudents: HelperStudent[] = students
    .filter((student) => !completedStudentIds.has(student.studentId))
    .map((student) => ({
      studentId: student.studentId,
      class: student.class,
      authUid: student.authUid,
    }))
    .sort((left, right) => left.studentId.localeCompare(right.studentId));

  return {
    completedVisits,
    pendingStudents,
  };
}

export async function bulkAwardBoothVisits(params: {
  boothId: string;
  studentIds: string[];
}): Promise<{
  awardedCount: number;
  skippedCount: number;
  pointsPerStudent: number;
}> {
  const boothId = normalizeBoothId(params.boothId);
  const booth = await getBooth(boothId);

  if (!booth) {
    throw new Error("Booth not found.");
  }

  const pointsAwarded = booth.points;
  const students = dedupeStudentsByStudentId(await listStudents());
  const studentById = new Map(
    students.map((student) => [student.studentId, student]),
  );

  const uniqueStudentIds = [
    ...new Set(params.studentIds.map((id) => normalizeStudentId(id))),
  ];

  let awardedCount = 0;
  let skippedCount = 0;

  for (const studentId of uniqueStudentIds) {
    const student = studentById.get(studentId);

    if (!student) {
      skippedCount += 1;
      continue;
    }

    const studentRef = getAdminDb().collection("students").doc(student.authUid);
    const visitRef = getAdminDb()
      .collection("visits")
      .doc(visitDocumentId(studentId, boothId));

    const awarded = await getAdminDb().runTransaction(async (transaction) => {
      const visitSnap = await transaction.get(visitRef);

      if (visitSnap.exists) {
        return false;
      }

      const studentSnap = await transaction.get(studentRef);

      if (!studentSnap.exists) {
        return false;
      }

      transaction.set(visitRef, {
        studentId,
        boothId,
        authUid: student.authUid,
        timestamp: FieldValue.serverTimestamp(),
        pointsAwarded,
      });

      transaction.update(studentRef, {
        totalPoints: FieldValue.increment(pointsAwarded),
        visitedBooths: FieldValue.arrayUnion(boothId),
      });

      return true;
    });

    if (awarded) {
      awardedCount += 1;
    } else {
      skippedCount += 1;
    }
  }

  return {
    awardedCount,
    skippedCount,
    pointsPerStudent: pointsAwarded,
  };
}

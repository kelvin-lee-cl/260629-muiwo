import { getAdminDb } from "@/lib/firebaseAdmin";
import { dedupeAllStudentRecords } from "@/lib/studentRecords";
import { isStudentOnline } from "@/lib/studentPresence";
import {
  dedupeStudentsByStudentId,
  type StudentSummary,
} from "@/lib/studentsAdminShared";

export { dedupeStudentsByStudentId, type StudentSummary };

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

export async function listStudents(): Promise<StudentSummary[]> {
  await dedupeAllStudentRecords();

  const snapshot = await getAdminDb().collection("students").get();
  const now = Date.now();

  return snapshot.docs
    .map((doc) => {
      const data = doc.data();
      const lastSeenMs = parseLastSeenMs(data);

      return {
        authUid: doc.id,
        studentId: typeof data.uid === "string" ? data.uid : "",
        class: typeof data.class === "string" ? data.class : "",
        number: typeof data.number === "string" ? data.number : "",
        totalPoints:
          typeof data.totalPoints === "number" ? data.totalPoints : 0,
        visitedCount: Array.isArray(data.visitedBooths)
          ? data.visitedBooths.length
          : 0,
        lastSeenMs,
        isOnline: isStudentOnline(lastSeenMs, now),
      };
    })
    .filter((student) => student.studentId)
    .sort((left, right) => left.studentId.localeCompare(right.studentId));
}

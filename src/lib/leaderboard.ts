import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebaseAdmin";
import type {
  LeaderboardDisplayEntry,
  LeaderboardTopEntry,
} from "@/lib/leaderboardTypes";
import { parseTop5Document } from "@/lib/leaderboardShared";
import { listStudents } from "@/lib/studentsAdmin";
import { dedupeStudentsByStudentId } from "@/lib/studentsAdminShared";

async function rankTop5FromFirestore(): Promise<LeaderboardTopEntry[]> {
  const students = await listStudents();

  return dedupeStudentsByStudentId(students)
    .sort((left, right) => {
      if (right.totalPoints !== left.totalPoints) {
        return right.totalPoints - left.totalPoints;
      }

      return left.studentId.localeCompare(right.studentId);
    })
    .slice(0, 5)
    .map((student) => ({
      studentId: student.studentId,
      points: student.totalPoints,
    }));
}

export async function readLeaderboardTop5(): Promise<LeaderboardDisplayEntry[]> {
  const snapshot = await getAdminDb().doc("leaderboard/top5").get();

  if (!snapshot.exists) {
    return [];
  }

  return parseTop5Document(snapshot.data());
}

export async function refreshLeaderboardTop5(): Promise<{
  top: LeaderboardTopEntry[];
}> {
  const top = await rankTop5FromFirestore();

  await getAdminDb().doc("leaderboard/top5").set(
    {
      top,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { top };
}

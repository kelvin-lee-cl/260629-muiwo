import { listStudents } from "@/lib/studentsAdmin";
import { dedupeStudentsByStudentId } from "@/lib/studentsAdminShared";
import type { StudentRankSummary } from "@/lib/leaderboardTypes";
import type {
  LeaderboardEntry,
  StudentLeaderboard,
} from "@/lib/studentDashboardTypes";

export type { LeaderboardEntry, StudentLeaderboard };

function rankStudents(
  students: Awaited<ReturnType<typeof listStudents>>,
): LeaderboardEntry[] {
  return dedupeStudentsByStudentId(students)
    .sort((left, right) => {
      if (right.totalPoints !== left.totalPoints) {
        return right.totalPoints - left.totalPoints;
      }

      return left.studentId.localeCompare(right.studentId);
    })
    .map((student, index) => ({
      rank: index + 1,
      studentId: student.studentId,
      totalPoints: student.totalPoints,
    }));
}

export async function getStudentRank(
  studentId: string,
): Promise<StudentRankSummary> {
  const students = await listStudents();
  const ranked = rankStudents(students);
  const normalizedStudentId = studentId.trim().toUpperCase();
  const myEntry = ranked.find(
    (entry) => entry.studentId === normalizedStudentId,
  );

  return {
    myRank: myEntry?.rank ?? null,
    totalStudents: ranked.length,
  };
}

// Fallback: full leaderboard aggregation on the server (reads all students).
export async function getStudentLeaderboard(
  studentId: string,
): Promise<StudentLeaderboard> {
  const students = await listStudents();
  const ranked = rankStudents(students);
  const normalizedStudentId = studentId.trim().toUpperCase();
  const myEntry = ranked.find(
    (entry) => entry.studentId === normalizedStudentId,
  );

  return {
    entries: ranked.slice(0, 5),
    myRank: myEntry?.rank ?? null,
    totalStudents: ranked.length,
  };
}

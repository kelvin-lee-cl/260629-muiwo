import type { StudentRankSummary } from "@/lib/leaderboardTypes";
import type { StudentLeaderboard } from "@/lib/studentDashboardTypes";

export type { StudentLeaderboard } from "@/lib/studentDashboardTypes";

export async function fetchStudentRank(
  token: string,
): Promise<StudentRankSummary> {
  const response = await fetch("/api/student/rank", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Could not load student rank.");
  }

  return (await response.json()) as StudentRankSummary;
}

// Fallback: loads top 5 and rank from the server (reads all students).
export async function fetchStudentLeaderboard(
  token: string,
): Promise<StudentLeaderboard> {
  const response = await fetch("/api/student/leaderboard", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Could not load leaderboard.");
  }

  return (await response.json()) as StudentLeaderboard;
}

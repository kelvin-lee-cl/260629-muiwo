import type { LeaderboardDisplayEntry } from "@/lib/leaderboardTypes";

export function parseTop5Document(
  data: Record<string, unknown> | undefined,
): LeaderboardDisplayEntry[] {
  if (!data || !Array.isArray(data.top)) {
    return [];
  }

  return data.top
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const studentId =
        typeof record.studentId === "string" ? record.studentId : "";
      const points = typeof record.points === "number" ? record.points : 0;

      if (!studentId) {
        return null;
      }

      return {
        rank: index + 1,
        studentId,
        totalPoints: points,
      };
    })
    .filter((entry): entry is LeaderboardDisplayEntry => entry !== null);
}

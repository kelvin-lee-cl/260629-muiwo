// Client-safe visit types — no firebase-admin imports.

export type VisitSummary = {
  studentId: string;
  boothId: string;
  boothTitle: string;
  authUid: string;
  pointsAwarded: number;
  timestampMs: number | null;
};

export function formatVisitTimestamp(timestampMs: number | null): string {
  if (timestampMs === null) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestampMs));
}

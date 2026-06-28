// Client-safe booth helper types — no firebase-admin imports.

export type HelperStudent = {
  studentId: string;
  class: string;
  authUid: string;
};

export type HelperCompletedVisit = {
  studentId: string;
  class: string;
  authUid: string;
  points: number;
  timestampMs: number | null;
};

export type BoothHelperData = {
  completedVisits: HelperCompletedVisit[];
  pendingStudents: HelperStudent[];
};

export function formatHelperVisitTime(timestampMs: number | null): string {
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

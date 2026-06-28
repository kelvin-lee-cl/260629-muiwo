// Client-safe student types and helpers — no firebase-admin imports.

export type StudentSummary = {
  authUid: string;
  studentId: string;
  class: string;
  number: string;
  totalPoints: number;
  visitedCount: number;
  lastSeenMs: number | null;
  isOnline: boolean;
};

export function dedupeStudentsByStudentId(
  students: StudentSummary[],
): StudentSummary[] {
  const bestByStudentId = new Map<string, StudentSummary>();

  for (const student of students) {
    const existing = bestByStudentId.get(student.studentId);

    if (!existing) {
      bestByStudentId.set(student.studentId, student);
      continue;
    }

    if (student.totalPoints > existing.totalPoints) {
      bestByStudentId.set(student.studentId, student);
      continue;
    }

    if (
      student.totalPoints === existing.totalPoints &&
      (student.lastSeenMs ?? 0) > (existing.lastSeenMs ?? 0)
    ) {
      bestByStudentId.set(student.studentId, student);
    }
  }

  return Array.from(bestByStudentId.values());
}

/** One row per student ID; keeps the freshest heartbeat across duplicate logins. */
export function dedupeStudentsForPresence(
  students: StudentSummary[],
): StudentSummary[] {
  const byStudentId = new Map<string, StudentSummary>();

  for (const student of students) {
    const existing = byStudentId.get(student.studentId);

    if (!existing) {
      byStudentId.set(student.studentId, student);
      continue;
    }

    const mergedLastSeenMs = Math.max(
      existing.lastSeenMs ?? 0,
      student.lastSeenMs ?? 0,
    );

    const preferred =
      (student.lastSeenMs ?? 0) >= (existing.lastSeenMs ?? 0)
        ? student
        : existing;

    byStudentId.set(student.studentId, {
      ...preferred,
      lastSeenMs: mergedLastSeenMs > 0 ? mergedLastSeenMs : null,
      isOnline: preferred.isOnline || student.isOnline,
    });
  }

  return Array.from(byStudentId.values()).sort((left, right) =>
    left.studentId.localeCompare(right.studentId),
  );
}

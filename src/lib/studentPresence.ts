export const ONLINE_THRESHOLD_MS = 3 * 60_000;

export function isStudentOnline(
  lastSeenMs: number | null,
  now = Date.now(),
): boolean {
  if (lastSeenMs === null) {
    return false;
  }

  return now - lastSeenMs <= ONLINE_THRESHOLD_MS;
}

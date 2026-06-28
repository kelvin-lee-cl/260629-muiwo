import { normalizeStudentId } from "@/lib/studentId";

export async function establishStudentSession(
  idToken: string,
  studentId: string,
): Promise<void> {
  const response = await fetch("/api/student/session", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ studentId: normalizeStudentId(studentId) }),
  });

  if (!response.ok) {
    let message = "Could not start student session.";

    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) {
        message = body.error;
      }
    } catch {
      // Ignore JSON parse errors.
    }

    throw new Error(message);
  }
}

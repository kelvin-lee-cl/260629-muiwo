import type { CheckpointPreview } from "@/lib/checkpoint";

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `Request failed (${response.status}).`;
  } catch {
    return `Request failed (${response.status}).`;
  }
}

export async function previewCheckpointCode(
  token: string,
  params: {
    studentId: string;
    enteredCode: string;
  },
): Promise<CheckpointPreview> {
  const response = await fetch("/api/checkpoint/preview", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as CheckpointPreview;
}

export async function checkCheckpointQuiz(
  token: string,
  params: {
    studentId: string;
    enteredCode: string;
    selectedOptionIndex: number;
  },
): Promise<{
  correct: boolean;
  message: string;
  wrongAttempts?: number;
  exhausted?: boolean;
}> {
  const response = await fetch("/api/checkpoint/quiz-check", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as {
    correct: boolean;
    message: string;
    wrongAttempts?: number;
    exhausted?: boolean;
  };
}

export type { CheckpointPreview };

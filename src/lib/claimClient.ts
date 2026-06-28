export type ClaimBoothResult = {
  success: true;
  pointsAwarded: number;
};

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `Request failed (${response.status}).`;
  } catch {
    return `Request failed (${response.status}).`;
  }
}

export async function claimBoothCode(
  token: string,
  params: {
    studentId: string;
    boothId: string;
    enteredCode: string;
    submissionWorkId?: string;
  },
): Promise<ClaimBoothResult> {
  const response = await fetch("/api/checkpoint/claim", {
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

  return (await response.json()) as ClaimBoothResult;
}

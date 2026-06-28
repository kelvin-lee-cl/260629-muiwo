import { NextResponse } from "next/server";

import { ClaimError, claimBoothVisit } from "@/lib/claim";
import { refreshLeaderboardTop5 } from "@/lib/leaderboard";
import { normalizeBoothId } from "@/lib/booths";
import { getEventSettings } from "@/lib/eventSettings";
import { RateLimitExceededError, consumeRateLimitAttempt } from "@/lib/rateLimit";
import { verifyStudentToken } from "@/lib/studentAuth";
import { normalizeStudentId } from "@/lib/studentId";

type ClaimRequestBody = {
  studentId?: unknown;
  boothId?: unknown;
  enteredCode?: unknown;
  submissionWorkId?: unknown;
};

function parseClaimBody(body: ClaimRequestBody) {
  if (
    typeof body.studentId !== "string" ||
    typeof body.boothId !== "string" ||
    typeof body.enteredCode !== "string"
  ) {
    return null;
  }

  const submissionWorkId =
    typeof body.submissionWorkId === "string" && body.submissionWorkId.trim()
      ? body.submissionWorkId.trim()
      : undefined;

  return {
    studentId: normalizeStudentId(body.studentId),
    boothId: normalizeBoothId(body.boothId),
    enteredCode: body.enteredCode,
    submissionWorkId,
  };
}

export async function POST(request: Request) {
  const authResult = await verifyStudentToken(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  let body: ClaimRequestBody;

  try {
    body = (await request.json()) as ClaimRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = parseClaimBody(body);

  if (!parsed) {
    return NextResponse.json({ error: "Invalid claim payload." }, { status: 400 });
  }

  try {
    const eventSettings = await getEventSettings();

    if (eventSettings.frozen) {
      return NextResponse.json(
        { error: "The event has ended. Code entry is closed." },
        { status: 403 },
      );
    }

    await consumeRateLimitAttempt(parsed.studentId);

    const result = await claimBoothVisit({
      authUid: authResult.authUid,
      studentId: parsed.studentId,
      boothId: parsed.boothId,
      enteredCode: parsed.enteredCode,
      submissionWorkId: parsed.submissionWorkId,
    });

    void refreshLeaderboardTop5().catch((refreshError) => {
      console.error("Leaderboard refresh failed after claim:", refreshError);
    });

    return NextResponse.json({
      success: true,
      pointsAwarded: result.pointsAwarded,
    });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
    }

    if (error instanceof ClaimError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error(error);
    return NextResponse.json(
      { error: "Could not claim booth points." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";

import { CheckpointError, checkCheckpointQuizAnswer } from "@/lib/checkpoint";
import { isEventFrozen } from "@/lib/eventSettings";
import { verifyStudentToken } from "@/lib/studentAuth";
import { normalizeStudentId } from "@/lib/studentId";

type QuizCheckBody = {
  studentId?: unknown;
  enteredCode?: unknown;
  selectedOptionIndex?: unknown;
};

export async function POST(request: Request) {
  const authResult = await verifyStudentToken(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  if (await isEventFrozen()) {
    return NextResponse.json(
      { error: "The event has ended. Code entry is closed." },
      { status: 403 },
    );
  }

  let body: QuizCheckBody;

  try {
    body = (await request.json()) as QuizCheckBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (
    typeof body.studentId !== "string" ||
    typeof body.enteredCode !== "string" ||
    typeof body.selectedOptionIndex !== "number" ||
    !Number.isInteger(body.selectedOptionIndex)
  ) {
    return NextResponse.json({ error: "Invalid quiz payload." }, { status: 400 });
  }

  try {
    const result = await checkCheckpointQuizAnswer({
      authUid: authResult.authUid,
      studentId: normalizeStudentId(body.studentId),
      enteredCode: body.enteredCode,
      selectedOptionIndex: body.selectedOptionIndex,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CheckpointError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error(error);
    return NextResponse.json(
      { error: "Could not check quiz answer." },
      { status: 500 },
    );
  }
}

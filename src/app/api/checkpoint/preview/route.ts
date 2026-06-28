import { NextResponse } from "next/server";

import { CheckpointError, previewCheckpointByCode } from "@/lib/checkpoint";
import { isEventFrozen } from "@/lib/eventSettings";
import { verifyStudentToken } from "@/lib/studentAuth";
import { normalizeStudentId } from "@/lib/studentId";

type PreviewBody = {
  studentId?: unknown;
  enteredCode?: unknown;
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

  let body: PreviewBody;

  try {
    body = (await request.json()) as PreviewBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body.studentId !== "string" || typeof body.enteredCode !== "string") {
    return NextResponse.json({ error: "Invalid checkpoint payload." }, { status: 400 });
  }

  try {
    const preview = await previewCheckpointByCode({
      authUid: authResult.authUid,
      studentId: normalizeStudentId(body.studentId),
      enteredCode: body.enteredCode,
    });

    return NextResponse.json(preview);
  } catch (error) {
    if (error instanceof CheckpointError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error(error);
    return NextResponse.json(
      { error: "Could not look up checkpoint." },
      { status: 500 },
    );
  }
}

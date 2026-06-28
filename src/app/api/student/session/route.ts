import { NextResponse } from "next/server";

import { resolveStudentSession } from "@/lib/studentRecords";
import { normalizeStudentId, validateStudentId } from "@/lib/studentId";
import { verifyStudentToken } from "@/lib/studentAuth";

type SessionBody = {
  studentId?: unknown;
};

export async function POST(request: Request) {
  const authResult = await verifyStudentToken(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  let body: SessionBody;

  try {
    body = (await request.json()) as SessionBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body.studentId !== "string") {
    return NextResponse.json({ error: "studentId is required." }, { status: 400 });
  }

  const validationError = validateStudentId(body.studentId);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const studentId = normalizeStudentId(body.studentId);

  try {
    await resolveStudentSession({
      authUid: authResult.authUid,
      studentId,
    });

    return NextResponse.json({ ok: true, studentId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not start student session." }, {
      status: 500,
    });
  }
}

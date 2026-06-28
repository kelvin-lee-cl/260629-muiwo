import { NextResponse } from "next/server";

import { isEventFrozen } from "@/lib/eventSettings";
import {
  createStudentWork,
  listStudentWorksForStudent,
  StudentWorkError,
} from "@/lib/studentWorks";
import { isBoothFeature } from "@/lib/booths";
import { verifyStudentToken } from "@/lib/studentAuth";
import { normalizeStudentId } from "@/lib/studentId";

type CreateWorkBody = {
  studentId?: unknown;
  venueId?: unknown;
  venueType?: unknown;
  feature?: unknown;
  prompt?: unknown;
  generatedText?: unknown;
  imageUrl?: unknown;
  videoUrl?: unknown;
  submissionText?: unknown;
  submissionUrl?: unknown;
};

export async function GET(request: Request) {
  const authResult = await verifyStudentToken(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const url = new URL(request.url);
  const studentIdParam = url.searchParams.get("studentId");

  if (!studentIdParam) {
    return NextResponse.json({ error: "studentId is required." }, { status: 400 });
  }

  const studentId = normalizeStudentId(studentIdParam);

  try {
    const works = await listStudentWorksForStudent(authResult.authUid, studentId);
    return NextResponse.json({ works });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not load student works." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const authResult = await verifyStudentToken(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  let body: CreateWorkBody;

  try {
    body = (await request.json()) as CreateWorkBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (
    typeof body.studentId !== "string" ||
    typeof body.venueId !== "string" ||
    (body.venueType !== "booth" &&
      body.venueType !== "workshop" &&
      body.venueType !== "checkpoint") ||
    typeof body.feature !== "string" ||
    !isBoothFeature(body.feature)
  ) {
    return NextResponse.json({ error: "Invalid work payload." }, { status: 400 });
  }

  try {
    if (await isEventFrozen()) {
      return NextResponse.json(
        { error: "The event has ended. Submissions are closed." },
        { status: 403 },
      );
    }

    const work = await createStudentWork({
      authUid: authResult.authUid,
      studentId: body.studentId,
      input: {
        venueId: body.venueId,
        venueType: body.venueType,
        feature: body.feature,
        prompt: typeof body.prompt === "string" ? body.prompt : undefined,
        generatedText:
          typeof body.generatedText === "string" ? body.generatedText : undefined,
        imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : undefined,
        videoUrl: typeof body.videoUrl === "string" ? body.videoUrl : undefined,
        submissionText:
          typeof body.submissionText === "string" ? body.submissionText : undefined,
        submissionUrl:
          typeof body.submissionUrl === "string" ? body.submissionUrl : undefined,
      },
    });

    return NextResponse.json({ work });
  } catch (error) {
    if (error instanceof StudentWorkError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error(error);
    return NextResponse.json(
      { error: "Could not save student work." },
      { status: 500 },
    );
  }
}

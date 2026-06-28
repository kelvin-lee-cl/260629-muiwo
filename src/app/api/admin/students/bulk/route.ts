import { NextResponse } from "next/server";

import {
  bulkRegisterStudentsByClass,
  MAX_CLASSES_PER_BATCH,
  MAX_STUDENTS_PER_BATCH,
  parseClassRegistrationInputs,
} from "@/lib/adminStudents";
import { verifySuperAdminRequest } from "@/lib/adminAuth";

type BulkStudentsBody = {
  classes?: unknown;
};

export async function POST(request: Request) {
  const unauthorized = await verifySuperAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  let body: BulkStudentsBody;

  try {
    body = (await request.json()) as BulkStudentsBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const classes = parseClassRegistrationInputs(body.classes);

  if (!classes || classes.length === 0) {
    return NextResponse.json(
      { error: "Provide at least one class with a max student count." },
      { status: 400 },
    );
  }

  if (classes.length > MAX_CLASSES_PER_BATCH) {
    return NextResponse.json(
      { error: `You can register at most ${MAX_CLASSES_PER_BATCH} classes at once.` },
      { status: 400 },
    );
  }

  const totalStudents = classes.reduce(
    (sum, entry) => sum + entry.maxStudents,
    0,
  );

  if (totalStudents > MAX_STUDENTS_PER_BATCH) {
    return NextResponse.json(
      {
        error: `This batch would create ${totalStudents} students. Maximum is ${MAX_STUDENTS_PER_BATCH}.`,
      },
      { status: 400 },
    );
  }

  try {
    const result = await bulkRegisterStudentsByClass(classes);
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not register students." },
      { status: 500 },
    );
  }
}

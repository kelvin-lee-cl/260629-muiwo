import { NextResponse } from "next/server";

import { deleteStudentData } from "@/lib/adminStudents";
import { verifySuperAdminRequest } from "@/lib/adminAuth";
import { parseStudentId } from "@/lib/studentId";

type RouteContext = {
  params: Promise<{ studentId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const unauthorized = await verifySuperAdminRequest(_request);

  if (unauthorized) {
    return unauthorized;
  }

  const { studentId } = await context.params;
  const decoded = decodeURIComponent(studentId);

  if (!parseStudentId(decoded)) {
    return NextResponse.json(
      { error: "Invalid student ID." },
      { status: 400 },
    );
  }

  try {
    const result = await deleteStudentData(decoded);
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not delete student." },
      { status: 500 },
    );
  }
}

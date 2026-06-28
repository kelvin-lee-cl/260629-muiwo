import { NextResponse } from "next/server";

import { deleteClassStudents } from "@/lib/adminStudents";
import { verifySuperAdminRequest } from "@/lib/adminAuth";
import { isValidClassCode, normalizeClassCode } from "@/lib/studentId";

type RouteContext = {
  params: Promise<{ classCode: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const unauthorized = await verifySuperAdminRequest(_request);

  if (unauthorized) {
    return unauthorized;
  }

  const { classCode } = await context.params;
  const normalized = normalizeClassCode(decodeURIComponent(classCode));

  if (!isValidClassCode(normalized)) {
    return NextResponse.json(
      { error: "Invalid class code." },
      { status: 400 },
    );
  }

  try {
    const result = await deleteClassStudents(normalized);
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not delete class." },
      { status: 500 },
    );
  }
}

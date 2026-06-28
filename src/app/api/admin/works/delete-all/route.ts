import { NextResponse } from "next/server";

import { verifySuperAdminRequest } from "@/lib/adminAuth";
import { DELETE_ALL_STUDENT_WORKS_PHRASE } from "@/lib/eventSettingsShared";
import { deleteAllStudentWorks } from "@/lib/studentWorks";

type DeleteStudentWorksBody = {
  confirmation?: unknown;
};

export async function POST(request: Request) {
  const unauthorized = await verifySuperAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  let body: DeleteStudentWorksBody;

  try {
    body = (await request.json()) as DeleteStudentWorksBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (body.confirmation !== DELETE_ALL_STUDENT_WORKS_PHRASE) {
    return NextResponse.json(
      {
        error: `Type ${DELETE_ALL_STUDENT_WORKS_PHRASE} exactly to confirm.`,
      },
      { status: 400 },
    );
  }

  try {
    const worksDeleted = await deleteAllStudentWorks();
    return NextResponse.json({ success: true, worksDeleted });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not delete student works." },
      { status: 500 },
    );
  }
}

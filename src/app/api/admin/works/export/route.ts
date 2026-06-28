import { NextResponse } from "next/server";

import { verifySuperAdminRequest } from "@/lib/adminAuth";
import { buildStudentWorksZip } from "@/lib/studentWorksExport";

export async function GET(request: Request) {
  const unauthorized = await verifySuperAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  try {
    const zipBuffer = await buildStudentWorksZip();

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition":
          'attachment; filename="stem-adventure-student-works.zip"',
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not export student works." },
      { status: 500 },
    );
  }
}

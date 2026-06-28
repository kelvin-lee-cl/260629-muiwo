import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/adminAuth";
import { listStudents } from "@/lib/studentsAdmin";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);

  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);

  if (searchParams.get("resource") === "students") {
    try {
      const students = await listStudents();
      return NextResponse.json({ students });
    } catch (error) {
      console.error(error);
      return NextResponse.json(
        { error: "Could not load students." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    role: auth.admin.role,
    email: auth.admin.email,
  });
}

export async function HEAD(request: Request) {
  const auth = await requireAdmin(request);
  return auth.ok ? new NextResponse(null, { status: 200 }) : auth.response;
}

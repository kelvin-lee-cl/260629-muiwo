import { NextResponse } from "next/server";

import { getAdminDb } from "@/lib/firebaseAdmin";
import { getStudentRank } from "@/lib/studentDashboard";
import { verifyStudentToken } from "@/lib/studentAuth";
import { normalizeStudentId } from "@/lib/studentId";

export async function GET(request: Request) {
  const authResult = await verifyStudentToken(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const studentSnap = await getAdminDb()
    .collection("students")
    .doc(authResult.authUid)
    .get();

  if (!studentSnap.exists) {
    return NextResponse.json({ error: "Student profile not found." }, { status: 404 });
  }

  const data = studentSnap.data();
  const studentId =
    typeof data?.uid === "string" ? normalizeStudentId(data.uid) : "";

  if (!studentId) {
    return NextResponse.json({ error: "Student profile not found." }, { status: 404 });
  }

  try {
    const rank = await getStudentRank(studentId);
    return NextResponse.json(rank);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not load student rank." },
      { status: 500 },
    );
  }
}

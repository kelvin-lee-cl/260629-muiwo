import { NextResponse } from "next/server";

import { getStudentLeaderboard } from "@/lib/studentDashboard";
import { verifyStudentToken } from "@/lib/studentAuth";
import { getAdminDb } from "@/lib/firebaseAdmin";
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
    const leaderboard = await getStudentLeaderboard(studentId);
    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not load leaderboard." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";

import { verifyFirebaseIdToken } from "@/lib/firebaseToken";

export async function verifyStudentToken(
  request: Request,
): Promise<{ authUid: string } | NextResponse> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const decoded = await verifyFirebaseIdToken(token);

    if (!decoded.uid) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    return { authUid: decoded.uid };
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
}

import { NextResponse } from "next/server";

import { readLeaderboardTop5 } from "@/lib/leaderboard";
import { verifyStudentToken } from "@/lib/studentAuth";

export async function GET(request: Request) {
  const authResult = await verifyStudentToken(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const entries = await readLeaderboardTop5();
    return NextResponse.json({ entries });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not load leaderboard." },
      { status: 500 },
    );
  }
}

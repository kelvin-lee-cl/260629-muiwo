import { NextResponse } from "next/server";

import { refreshLeaderboardTop5 } from "@/lib/leaderboard";

export async function GET() {
  try {
    const { top } = await refreshLeaderboardTop5();

    return NextResponse.json({
      success: true,
      top,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not refresh leaderboard." },
      { status: 500 },
    );
  }
}

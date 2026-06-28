import { NextResponse } from "next/server";

import { verifySuperAdminRequest } from "@/lib/adminAuth";
import { buildActivityCsv, buildScoresCsv } from "@/lib/eventSettings";

export async function GET(request: Request) {
  const unauthorized = await verifySuperAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "both";

  try {
    if (type === "scores") {
      const csv = await buildScoresCsv();
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="stem-adventure-scores.csv"',
        },
      });
    }

    if (type === "activity") {
      const csv = await buildActivityCsv();
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="stem-adventure-activity.csv"',
        },
      });
    }

    if (type === "both") {
      const [scoresCsv, activityCsv] = await Promise.all([
        buildScoresCsv(),
        buildActivityCsv(),
      ]);

      return NextResponse.json({ scoresCsv, activityCsv });
    }

    return NextResponse.json(
      { error: "type must be scores, activity, or both." },
      { status: 400 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not export event data." },
      { status: 500 },
    );
  }
}

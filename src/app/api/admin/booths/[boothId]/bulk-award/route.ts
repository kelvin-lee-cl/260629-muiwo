import { NextResponse } from "next/server";

import { verifyAdminRequest } from "@/lib/adminAuth";
import { bulkAwardBoothVisits } from "@/lib/boothHelper";
import { normalizeBoothId } from "@/lib/booths";
import { normalizeStudentId } from "@/lib/studentId";

type RouteContext = {
  params: Promise<{ boothId: string }>;
};

type BulkAwardBody = {
  studentIds?: unknown;
};

export async function POST(request: Request, context: RouteContext) {
  const unauthorized = await verifyAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  const { boothId: rawBoothId } = await context.params;
  const boothId = normalizeBoothId(rawBoothId);

  let body: BulkAwardBody;

  try {
    body = (await request.json()) as BulkAwardBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!Array.isArray(body.studentIds)) {
    return NextResponse.json(
      { error: "studentIds must be an array." },
      { status: 400 },
    );
  }

  const studentIds = body.studentIds
    .filter((id): id is string => typeof id === "string")
    .map((id) => normalizeStudentId(id))
    .filter(Boolean);

  if (studentIds.length === 0) {
    return NextResponse.json(
      { error: "Select at least one student." },
      { status: 400 },
    );
  }

  try {
    const result = await bulkAwardBoothVisits({ boothId, studentIds });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Could not award points.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

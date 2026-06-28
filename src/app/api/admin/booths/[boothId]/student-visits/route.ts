import { NextResponse } from "next/server";

import { verifyAdminRequest } from "@/lib/adminAuth";
import { getBoothHelperData } from "@/lib/boothHelper";
import { normalizeBoothId } from "@/lib/booths";

type RouteContext = {
  params: Promise<{ boothId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const unauthorized = await verifyAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  const { boothId: rawBoothId } = await context.params;
  const boothId = normalizeBoothId(rawBoothId);

  try {
    const data = await getBoothHelperData(boothId);
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Could not load student visit data.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

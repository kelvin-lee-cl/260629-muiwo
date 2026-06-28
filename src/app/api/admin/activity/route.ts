import { NextResponse } from "next/server";

import { verifyAdminRequest } from "@/lib/adminAuth";
import { listVisits } from "@/lib/eventSettings";

export async function GET(request: Request) {
  const unauthorized = await verifyAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  try {
    const visits = await listVisits();
    return NextResponse.json({ visits });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not load activity." },
      { status: 500 },
    );
  }
}

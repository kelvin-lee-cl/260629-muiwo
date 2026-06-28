import { NextResponse } from "next/server";

import { verifyAdminRequest } from "@/lib/adminAuth";
import { validateBoothInput } from "@/lib/booths";
import {
  createBooth,
  listBooths,
} from "@/lib/boothsAdmin";
import { parseBoothInputBody } from "@/lib/parseBoothInput";

export async function GET(request: Request) {
  const unauthorized = await verifyAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  try {
    const booths = await listBooths();
    return NextResponse.json({ booths });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not load booths." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const unauthorized = await verifyAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  try {
    const body = await request.json();
    const input = parseBoothInputBody(body);

    if (!input) {
      return NextResponse.json({ error: "Invalid booth payload." }, { status: 400 });
    }

    const validationError = validateBoothInput(input);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const booth = await createBooth(input);
    return NextResponse.json({ booth }, { status: 201 });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Could not create booth.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function HEAD(request: Request) {
  const unauthorized = await verifyAdminRequest(request);
  return unauthorized ?? new NextResponse(null, { status: 200 });
}

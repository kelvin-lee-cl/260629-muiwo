import { NextResponse } from "next/server";

import { verifyAdminRequest } from "@/lib/adminAuth";
import { deleteBooth, getBooth, updateBooth } from "@/lib/boothsAdmin";
import {
  normalizeBoothId,
  validateBoothInput,
} from "@/lib/booths";
import { parseBoothInputBody } from "@/lib/parseBoothInput";

type RouteContext = {
  params: Promise<{ boothId: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const unauthorized = await verifyAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  const { boothId: rawBoothId } = await context.params;
  const boothId = normalizeBoothId(rawBoothId);

  try {
    const body = await request.json();
    const input = parseBoothInputBody(body, { requireId: false });

    if (!input) {
      return NextResponse.json({ error: "Invalid booth payload." }, { status: 400 });
    }

    const validationError = validateBoothInput({ ...input, id: boothId });

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const booth = await updateBooth(boothId, { ...input, id: boothId });
    return NextResponse.json({ booth });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Could not update booth.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const unauthorized = await verifyAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  const { boothId: rawBoothId } = await context.params;
  const boothId = normalizeBoothId(rawBoothId);

  try {
    await deleteBooth(boothId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Could not delete booth.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(request: Request, context: RouteContext) {
  const { boothId: rawBoothId } = await context.params;
  const boothId = normalizeBoothId(rawBoothId);

  try {
    const booth = await getBooth(boothId);

    if (!booth) {
      return NextResponse.json({ error: "Booth not found." }, { status: 404 });
    }

    return NextResponse.json({ booth });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not load booth." },
      { status: 500 },
    );
  }
}

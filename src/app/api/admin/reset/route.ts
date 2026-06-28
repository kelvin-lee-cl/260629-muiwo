import { NextResponse } from "next/server";

import { verifySuperAdminRequest } from "@/lib/adminAuth";
import {
  RESET_CONFIRMATION_PHRASE,
  resetAllEventData,
} from "@/lib/eventSettings";

type ResetBody = {
  confirmation?: unknown;
};

export async function POST(request: Request) {
  const unauthorized = await verifySuperAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  let body: ResetBody;

  try {
    body = (await request.json()) as ResetBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (body.confirmation !== RESET_CONFIRMATION_PHRASE) {
    return NextResponse.json(
      {
        error: `Type ${RESET_CONFIRMATION_PHRASE} exactly to confirm.`,
      },
      { status: 400 },
    );
  }

  try {
    const result = await resetAllEventData();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not reset event data." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";

import { verifySuperAdminRequest } from "@/lib/adminAuth";
import { deleteAllBooths } from "@/lib/boothsAdmin";
import { DELETE_ALL_BOOTHS_PHRASE } from "@/lib/eventSettingsShared";

type DeleteBoothsBody = {
  confirmation?: unknown;
};

export async function POST(request: Request) {
  const unauthorized = await verifySuperAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  let body: DeleteBoothsBody;

  try {
    body = (await request.json()) as DeleteBoothsBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (body.confirmation !== DELETE_ALL_BOOTHS_PHRASE) {
    return NextResponse.json(
      {
        error: `Type ${DELETE_ALL_BOOTHS_PHRASE} exactly to confirm.`,
      },
      { status: 400 },
    );
  }

  try {
    const boothsDeleted = await deleteAllBooths();
    return NextResponse.json({ success: true, boothsDeleted });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not delete booths." },
      { status: 500 },
    );
  }
}

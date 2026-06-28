import { NextResponse } from "next/server";

import {
  getEventSettings,
  syncPublicEventStatusIfNeeded,
} from "@/lib/eventSettings";

export async function GET() {
  try {
    const settings = await getEventSettings();
    await syncPublicEventStatusIfNeeded(settings.frozen);
    return NextResponse.json({
      frozen: settings.frozen,
      galleryImages: settings.galleryImages,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not load event status." },
      { status: 500 },
    );
  }
}

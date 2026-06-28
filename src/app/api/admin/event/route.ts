import { NextResponse } from "next/server";

import { verifySuperAdminRequest } from "@/lib/adminAuth";
import {
  getEventSettings,
  setEventFrozen,
  setGalleryImages,
  setProjectNotes,
} from "@/lib/eventSettings";

export async function GET(request: Request) {
  const unauthorized = await verifySuperAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  try {
    const settings = await getEventSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not load event settings." },
      { status: 500 },
    );
  }
}

type EventBody = {
  frozen?: unknown;
  projectNotes?: unknown;
  galleryImages?: unknown;
};

function parseGalleryImagesBody(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  if (!value.every((entry) => typeof entry === "string")) {
    return null;
  }

  return value.map((entry) => entry.trim()).filter(Boolean);
}

export async function PUT(request: Request) {
  const unauthorized = await verifySuperAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  let body: EventBody;

  try {
    body = (await request.json()) as EventBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body.frozen !== "boolean") {
    return NextResponse.json(
      { error: "frozen must be a boolean." },
      { status: 400 },
    );
  }

  try {
    const settings = await setEventFrozen(body.frozen);
    return NextResponse.json(settings);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not update event settings." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const unauthorized = await verifySuperAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  let body: EventBody;

  try {
    body = (await request.json()) as EventBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const hasProjectNotes = typeof body.projectNotes === "string";
  const galleryImages = parseGalleryImagesBody(body.galleryImages);
  const hasGalleryImages = galleryImages !== null;

  if (!hasProjectNotes && !hasGalleryImages) {
    return NextResponse.json(
      { error: "Provide projectNotes and/or galleryImages." },
      { status: 400 },
    );
  }

  try {
    if (hasProjectNotes) {
      await setProjectNotes(body.projectNotes as string);
    }

    if (hasGalleryImages) {
      await setGalleryImages(galleryImages);
    }

    const settings = await getEventSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not save event settings." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";

import { verifyAdminRequest } from "@/lib/adminAuth";
import { isBoothFeature } from "@/lib/booths";
import { listStudentWorksForAdmin } from "@/lib/studentWorks";

export async function GET(request: Request) {
  const unauthorized = await verifyAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  const url = new URL(request.url);
  const featureParam = url.searchParams.get("feature");
  const feature =
    featureParam && isBoothFeature(featureParam) ? featureParam : undefined;

  if (featureParam && !feature) {
    return NextResponse.json({ error: "Invalid feature filter." }, { status: 400 });
  }

  try {
    const works = await listStudentWorksForAdmin(feature);
    return NextResponse.json({ works });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not load student works." },
      { status: 500 },
    );
  }
}

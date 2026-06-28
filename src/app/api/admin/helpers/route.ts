import { NextResponse } from "next/server";

import { isSuperAdminEmail, requireAdmin } from "@/lib/adminAuth";
import {
  addAdminHelpers,
  isAllowedHelperEmail,
  listAdminHelpers,
  removeAdminHelper,
} from "@/lib/adminHelpers";

const MAX_BATCH_SIZE = 100;

function parseEmailLines(raw: unknown): string[] | null {
  if (typeof raw !== "string") {
    return null;
  }

  return raw
    .split(/[\n,;]+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request, { superOnly: true });

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const helpers = await listAdminHelpers();
    return NextResponse.json({ helpers });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not load admin helpers." },
      { status: 500 },
    );
  }
}

type HelpersBody = {
  emails?: unknown;
  email?: unknown;
};

export async function POST(request: Request) {
  const auth = await requireAdmin(request, { superOnly: true });

  if (!auth.ok) {
    return auth.response;
  }

  let body: HelpersBody;

  try {
    body = (await request.json()) as HelpersBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed =
    parseEmailLines(body.emails) ??
    (typeof body.email === "string" ? [body.email.trim()] : null);

  if (!parsed || parsed.length === 0) {
    return NextResponse.json(
      { error: "Provide one or more email addresses (one per line)." },
      { status: 400 },
    );
  }

  if (parsed.length > MAX_BATCH_SIZE) {
    return NextResponse.json(
      { error: `You can add at most ${MAX_BATCH_SIZE} helpers at once.` },
      { status: 400 },
    );
  }

  const disallowedDomain = parsed.filter(
    (email) => !isAllowedHelperEmail(email),
  );

  if (disallowedDomain.length === parsed.length) {
    return NextResponse.json(
      {
        error:
          "Helpers must use Gmail (@gmail.com) or an approved Google Workspace domain.",
      },
      { status: 400 },
    );
  }

  const superAdminEmails = parsed.filter((email) =>
    isSuperAdminEmail(email),
  );

  if (superAdminEmails.length > 0) {
    return NextResponse.json(
      {
        error:
          "Super admin emails cannot be added as helpers.",
        superAdminEmails,
      },
      { status: 400 },
    );
  }

  try {
    const result = await addAdminHelpers(parsed, auth.admin.email);
    const helpers = await listAdminHelpers();

    return NextResponse.json({
      ...result,
      helpers,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not add admin helpers." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request, { superOnly: true });

  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim();

  if (!email || !isAllowedHelperEmail(email)) {
    return NextResponse.json(
      { error: "A valid helper email is required." },
      { status: 400 },
    );
  }

  if (isSuperAdminEmail(email)) {
    return NextResponse.json(
      { error: "Super admin accounts cannot be removed as helpers." },
      { status: 400 },
    );
  }

  try {
    const removed = await removeAdminHelper(email);

    if (!removed) {
      return NextResponse.json(
        { error: "Helper not found." },
        { status: 404 },
      );
    }

    const helpers = await listAdminHelpers();
    return NextResponse.json({ removed: email, helpers });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not remove admin helper." },
      { status: 500 },
    );
  }
}

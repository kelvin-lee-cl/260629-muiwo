import { NextResponse } from "next/server";

import { isHelperEmail } from "@/lib/adminHelpers";
import { verifyFirebaseIdToken } from "@/lib/firebaseToken";
import type { AdminRole } from "@/lib/adminRolesShared";

export type VerifiedAdmin = {
  uid: string;
  email: string;
  role: AdminRole;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Top-level admins — full access including Event Controls. Server env only. */
export function getSuperAdminEmails(): string[] {
  const raw =
    process.env.ADMIN_SUPER_EMAILS ?? process.env.ADMIN_ALLOWED_EMAILS ?? "";

  return raw
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter(Boolean);
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  return getSuperAdminEmails().includes(normalizeEmail(email));
}

export async function resolveAdminRole(
  email: string | null | undefined,
): Promise<AdminRole | null> {
  if (!email) {
    return null;
  }

  if (isSuperAdminEmail(email)) {
    return "super";
  }

  if (await isHelperEmail(email)) {
    return "helper";
  }

  return null;
}

type RequireAdminOptions = {
  superOnly?: boolean;
};

type RequireAdminResult =
  | { ok: true; admin: VerifiedAdmin }
  | { ok: false; response: NextResponse };

export async function requireAdmin(
  request: Request,
  options: RequireAdminOptions = {},
): Promise<RequireAdminResult> {
  const superEmails = getSuperAdminEmails();

  if (superEmails.length === 0 && !options.superOnly) {
    // Helpers may still exist in Firestore even without super admins configured.
    // Super-only routes still need at least one super admin.
  }

  if (options.superOnly && superEmails.length === 0) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "ADMIN_SUPER_EMAILS is not configured on the server.",
        },
        { status: 500 },
      ),
    };
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const decoded = await verifyFirebaseIdToken(token);
    const email = decoded.email?.trim();

    if (!email) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Unauthorized." }, { status: 403 }),
      };
    }

    const role = await resolveAdminRole(email);

    if (!role) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Unauthorized." }, { status: 403 }),
      };
    }

    if (options.superOnly && role !== "super") {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Super admin access required." },
          { status: 403 },
        ),
      };
    }

    return {
      ok: true,
      admin: {
        uid: decoded.uid,
        email: normalizeEmail(email),
        role,
      },
    };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }
}

/** Allows super admins and helpers. */
export async function verifyAdminRequest(
  request: Request,
): Promise<NextResponse | null> {
  const result = await requireAdmin(request);
  return result.ok ? null : result.response;
}

/** Allows super admins only (Event Controls and destructive operations). */
export async function verifySuperAdminRequest(
  request: Request,
): Promise<NextResponse | null> {
  const result = await requireAdmin(request, { superOnly: true });
  return result.ok ? null : result.response;
}

/** @deprecated Use isSuperAdminEmail or resolveAdminRole instead. */
export function isAllowedAdminEmail(email: string | null | undefined): boolean {
  return isSuperAdminEmail(email);
}

/** @deprecated Use getSuperAdminEmails instead. */
export function getAllowedAdminEmails(): string[] {
  return getSuperAdminEmails();
}

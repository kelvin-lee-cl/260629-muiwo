import { NextResponse } from "next/server";

type HealthCheck = {
  ok: boolean;
  message: string;
};

function hasSuperAdminEmails(): boolean {
  const raw =
    process.env.ADMIN_SUPER_EMAILS ?? process.env.ADMIN_ALLOWED_EMAILS ?? "";

  return raw
    .split(",")
    .map((email) => email.trim())
    .some(Boolean);
}

function checkServiceAccountKey(): HealthCheck {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();

  if (!raw) {
    return {
      ok: false,
      message: "FIREBASE_SERVICE_ACCOUNT_KEY is not set.",
    };
  }

  try {
    const parsed = JSON.parse(raw) as {
      project_id?: string;
      private_key?: string;
      client_email?: string;
    };

    if (!parsed.project_id || !parsed.private_key || !parsed.client_email) {
      return {
        ok: false,
        message:
          "FIREBASE_SERVICE_ACCOUNT_KEY is missing project_id, private_key, or client_email.",
      };
    }

    return { ok: true, message: "Service account JSON parsed successfully." };
  } catch {
    return {
      ok: false,
      message:
        "FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON. Paste the full key as a single-line string with \\n in the private key.",
    };
  }
}

export async function GET() {
  const checks = {
    nextPublicFirebaseApiKey: Boolean(
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim(),
    ),
    nextPublicFirebaseProjectId: Boolean(
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
    ),
    firebaseServiceAccount: checkServiceAccountKey(),
    adminSuperEmails: hasSuperAdminEmails(),
  };

  const ok =
    checks.nextPublicFirebaseApiKey &&
    checks.nextPublicFirebaseProjectId &&
    checks.firebaseServiceAccount.ok &&
    checks.adminSuperEmails;

  return NextResponse.json(
    {
      ok,
      checks,
      hint: ok
        ? "Server environment looks configured."
        : "Fix the failing checks in Vercel → Settings → Environment Variables, then redeploy.",
    },
    { status: ok ? 200 : 503 },
  );
}

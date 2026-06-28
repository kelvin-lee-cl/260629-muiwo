import {
  FieldValue,
  Timestamp,
  type FieldValue as FieldValueType,
} from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebaseAdmin";

const HELPERS_COLLECTION = "adminHelpers";
const CACHE_TTL_MS = 60_000;

export type AdminHelperDocument = {
  email: string;
  addedAt: Timestamp | FieldValueType;
  addedBy: string;
};

type HelperCache = {
  emails: Set<string>;
  expiresAt: number;
};

let helperCache: HelperCache | null = null;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

/** Google Workspace and other domains allowed for helper sign-in (Firebase Google auth). */
export function getAllowedHelperDomains(): Set<string> {
  const fromEnv = (
    process.env.ADMIN_HELPER_ALLOWED_DOMAINS ?? "futureleadersunion.com"
  )
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);

  return new Set([...GMAIL_DOMAINS, ...fromEnv]);
}

export function isValidHelperEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

export function isAllowedHelperEmail(email: string): boolean {
  if (!isValidHelperEmail(email)) {
    return false;
  }

  const domain = normalizeEmail(email).split("@")[1] ?? "";
  return getAllowedHelperDomains().has(domain);
}

export function getEnvHelperEmails(): string[] {
  const raw = process.env.ADMIN_INITIAL_HELPERS ?? "";

  return raw
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter(isAllowedHelperEmail);
}

function invalidateHelperCache(): void {
  helperCache = null;
}

let initialHelpersSync: Promise<void> | null = null;

async function syncInitialHelpersToFirestore(): Promise<void> {
  const initial = getEnvHelperEmails();

  if (initial.length === 0) {
    return;
  }

  const existing = await loadHelperEmails();
  const missing = initial.filter((email) => !existing.has(email));

  if (missing.length === 0) {
    return;
  }

  await addAdminHelpers(missing, "system");
}

function ensureInitialHelpersSeeded(): Promise<void> {
  initialHelpersSync ??= syncInitialHelpersToFirestore().catch((error) => {
    initialHelpersSync = null;
    throw error;
  });

  return initialHelpersSync;
}

async function loadHelperEmails(): Promise<Set<string>> {
  const now = Date.now();

  if (helperCache && helperCache.expiresAt > now) {
    return helperCache.emails;
  }

  const snapshot = await getAdminDb().collection(HELPERS_COLLECTION).get();
  const emails = new Set(
    snapshot.docs
      .map((doc) => normalizeEmail(doc.id))
      .filter(Boolean),
  );

  helperCache = {
    emails,
    expiresAt: now + CACHE_TTL_MS,
  };

  return emails;
}

export async function isHelperEmail(
  email: string | null | undefined,
): Promise<boolean> {
  if (!email) {
    return false;
  }

  const normalized = normalizeEmail(email);

  if (getEnvHelperEmails().includes(normalized)) {
    return true;
  }

  await ensureInitialHelpersSeeded();
  const helpers = await loadHelperEmails();
  return helpers.has(normalized);
}

export async function listAdminHelpers(): Promise<
  Array<{ email: string; addedAt: string | null; addedBy: string }>
> {
  await ensureInitialHelpersSeeded();

  const snapshot = await getAdminDb()
    .collection(HELPERS_COLLECTION)
    .orderBy("addedAt", "desc")
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data() as AdminHelperDocument;
    const addedAt =
      data.addedAt &&
      typeof data.addedAt === "object" &&
      "toDate" in data.addedAt
        ? data.addedAt.toDate().toISOString()
        : null;

    return {
      email: data.email ?? doc.id,
      addedAt,
      addedBy: data.addedBy ?? "",
    };
  });
}

export async function addAdminHelpers(
  rawEmails: string[],
  addedBy: string,
): Promise<{
  added: string[];
  skipped: string[];
  invalid: string[];
}> {
  const unique = [...new Set(rawEmails.map(normalizeEmail).filter(Boolean))];
  const added: string[] = [];
  const skipped: string[] = [];
  const invalid: string[] = [];

  const db = getAdminDb();
  const batch = db.batch();
  const existing = await loadHelperEmails();

  for (const email of unique) {
    if (!isAllowedHelperEmail(email)) {
      invalid.push(email);
      continue;
    }

    if (existing.has(email)) {
      skipped.push(email);
      continue;
    }

    const ref = db.collection(HELPERS_COLLECTION).doc(email);
    const profile: AdminHelperDocument = {
      email,
      addedAt: FieldValue.serverTimestamp(),
      addedBy,
    };

    batch.set(ref, profile, { merge: true });
    added.push(email);
    existing.add(email);
  }

  if (added.length > 0) {
    await batch.commit();
    invalidateHelperCache();
  }

  return { added, skipped, invalid };
}

export async function removeAdminHelper(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);

  if (!normalized) {
    return false;
  }

  const ref = getAdminDb().collection(HELPERS_COLLECTION).doc(normalized);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    return false;
  }

  await ref.delete();
  invalidateHelperCache();
  return true;
}

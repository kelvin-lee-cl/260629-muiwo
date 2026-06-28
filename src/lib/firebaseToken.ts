export type VerifiedFirebaseToken = {
  uid: string;
  email?: string;
};

type LookupResponse = {
  users?: Array<{
    localId?: string;
    email?: string;
  }>;
  error?: {
    message?: string;
  };
};

export async function verifyFirebaseIdToken(
  token: string,
): Promise<VerifiedFirebaseToken> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY is not set");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }),
      cache: "no-store",
    },
  );

  const body = (await response.json()) as LookupResponse;
  const user = body.users?.[0];

  if (!response.ok || !user?.localId) {
    throw new Error(body.error?.message ?? "Invalid Firebase ID token.");
  }

  return {
    uid: user.localId,
    email: user.email,
  };
}

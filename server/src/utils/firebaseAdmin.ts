import { cert, getApps, initializeApp, type App, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not set");
  }

  const serviceAccount = JSON.parse(serviceAccountJson) as ServiceAccount;

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

export async function verifyBearerToken(
  authorizationHeader: string | undefined,
): Promise<string> {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new Error("Missing authorization token.");
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();
  if (!token) {
    throw new Error("Missing authorization token.");
  }

  getFirebaseAdminApp();
  const decoded = await getAuth().verifyIdToken(token);
  return decoded.uid;
}

import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Server-side only — do not import this module in Client Components.

let cachedApp: App | undefined;
let cachedDb: Firestore | undefined;
let cachedAuth: Auth | undefined;

function initFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set");
  }

  const serviceAccount = JSON.parse(serviceAccountKey) as ServiceAccount;

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

export function getFirebaseAdmin(): App {
  cachedApp ??= initFirebaseAdminApp();
  return cachedApp;
}

export function getAdminDb(): Firestore {
  cachedDb ??= getFirestore(getFirebaseAdmin());
  return cachedDb;
}

export function getAdminAuth(): Auth {
  cachedAuth ??= getAuth(getFirebaseAdmin());
  return cachedAuth;
}

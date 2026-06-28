import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";

import type { AdminRole } from "@/lib/adminRolesShared";
import { getClientDb } from "@/lib/firebaseClient";

export type AdminDocument = {
  email: string;
  displayName: string;
  role: AdminRole;
  lastLogin: ReturnType<typeof serverTimestamp>;
};

export async function upsertAdminProfile(
  user: User,
  role: AdminRole,
): Promise<void> {
  if (!user.email) {
    throw new Error("Google account has no email.");
  }

  const profile: AdminDocument = {
    email: user.email,
    displayName: user.displayName ?? "",
    role,
    lastLogin: serverTimestamp(),
  };

  await setDoc(doc(getClientDb(), "admins", user.uid), profile, { merge: true });
}

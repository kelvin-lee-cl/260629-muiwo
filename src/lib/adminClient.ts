import { GoogleAuthProvider, type User } from "firebase/auth";

export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({ prompt: "select_account" });

export function isGoogleUser(user: User | null): boolean {
  return Boolean(
    user?.providerData.some(
      (provider) => provider.providerId === "google.com",
    ),
  );
}

export function isAnonymousStudentSession(
  user: User | null,
  studentId: string | null,
): boolean {
  return Boolean(user?.isAnonymous && studentId);
}

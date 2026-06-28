import type { User } from "firebase/auth";

export const STUDENT_ID_STORAGE_KEY = "studentId";

export function readStoredStudentId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(STUDENT_ID_STORAGE_KEY);
}

export function writeStoredStudentId(studentId: string): void {
  localStorage.setItem(STUDENT_ID_STORAGE_KEY, studentId);
}

export function clearStoredStudentId(): void {
  localStorage.removeItem(STUDENT_ID_STORAGE_KEY);
}

export function isStudentSession(
  authUser: User | null,
  studentId: string | null,
): boolean {
  return Boolean(authUser?.isAnonymous && studentId);
}

export function isProtectedStudentPath(pathname: string): boolean {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/checkpoint") ||
    pathname.startsWith("/booth/") ||
    pathname.startsWith("/workshop/")
  );
}

export function isAdminPath(pathname: string): boolean {
  return pathname.startsWith("/admin");
}

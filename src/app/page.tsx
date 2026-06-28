"use client";

import {
  FormEvent,
  useState,
  type ChangeEvent,
} from "react";
import { FirebaseError } from "firebase/app";
import { signInAnonymously, signInWithPopup, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

import { useStudent } from "@/contexts/StudentContext";
import { upsertAdminProfile } from "@/lib/admins";
import { verifyAdminAccess, formatAdminVerifyError } from "@/lib/adminApi";
import {
  googleAuthProvider,
  isAnonymousStudentSession,
} from "@/lib/adminClient";
import { getClientAuth } from "@/lib/firebaseClient";
import { APP_TITLE, EVENT_NAME } from "@/lib/appBranding";
import { establishStudentSession } from "@/lib/studentLoginClient";
import {
  normalizeStudentId,
  validateStudentId,
} from "@/lib/studentId";

export default function LoginPage() {
  return <LoginPageContent />;
}

function LoginPageContent() {
  const router = useRouter();
  const { authUser, studentId, setStudentId } = useStudent();
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminSubmitting, setAdminSubmitting] = useState(false);

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const normalized = normalizeStudentId(event.target.value).slice(0, 4);
    setInput(normalized);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const validationError = validateStudentId(input);
    if (validationError) {
      setError(validationError);
      return;
    }

    const studentCode = normalizeStudentId(input);

    setSubmitting(true);

    try {
      const credential = await signInAnonymously(getClientAuth());
      const token = await credential.user.getIdToken();
      await establishStudentSession(token, studentCode);
      setStudentId(studentCode);
      router.push("/dashboard");
    } catch (submitError) {
      console.error(submitError);
      setError("無法登入，請再試一次。");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAdminLogin() {
    setAdminError(null);

    if (isAnonymousStudentSession(authUser, studentId)) {
      setAdminError(
        "你已以學生身份登入。請先從學生主頁登出，再使用管理員登入。",
      );
      return;
    }

    setAdminSubmitting(true);

    try {
      const credential = await signInWithPopup(getClientAuth(), googleAuthProvider);
      const token = await credential.user.getIdToken(true);
      const result = await verifyAdminAccess(token);

      if (!result.ok) {
        await signOut(getClientAuth());
        setAdminError(formatAdminVerifyError(result, credential.user.email));
        return;
      }

      await upsertAdminProfile(credential.user, result.access.role);
      router.push("/admin/dashboard");
    } catch (loginError) {
      console.error(loginError);

      if (
        loginError instanceof FirebaseError &&
        loginError.code === "auth/unauthorized-domain"
      ) {
        setAdminError(
          "此網域未獲 Firebase 授權。請在 Firebase Console → Authentication → Authorized domains 加入 260623-maryknoll.vercel.app。",
        );
        return;
      }

      if (loginError instanceof Error && loginError.message.includes("Google account has no email")) {
        setAdminError("此 Google 帳戶沒有電郵地址，無法用作管理員登入。");
        return;
      }

      setAdminError("無法使用 Google 登入，請再試一次。");
    } finally {
      setAdminSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center py-8 sm:py-12">
      <div className="w-full max-w-lg rounded-3xl border border-sky-100 bg-white p-8 shadow-lg shadow-sky-100/80 sm:p-10">
        <p className="text-center text-sm font-semibold uppercase tracking-wide text-sky-600">
          {APP_TITLE}
        </p>
        <h1 className="mt-2 text-center text-3xl font-bold tracking-tight text-sky-950 sm:text-4xl">
          {EVENT_NAME}
        </h1>
        <p className="mt-3 text-center text-lg text-slate-600">
          請輸入班別及學號開始
        </p>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="student-id"
              className="mb-3 block text-base font-medium text-slate-700 sm:text-lg"
            >
              請輸入班別及學號（例如 4D01）
            </label>
            <input
              id="student-id"
              name="studentId"
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={4}
              value={input}
              onChange={handleInputChange}
              placeholder="4D01"
              className="w-full rounded-2xl border border-sky-200 bg-sky-50/50 px-5 py-4 text-center text-2xl font-semibold tracking-widest text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
            />
          </div>

          {error ? (
            <p
              className="rounded-xl bg-red-50 px-4 py-3 text-center text-base text-red-700"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-sky-600 px-6 py-5 text-xl font-semibold text-white transition hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "開始中..." : "開始"}
          </button>
        </form>

        <div className="mt-8 border-t border-slate-100 pt-6">
          {adminError ? (
            <p
              className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-center text-base text-red-700"
              role="alert"
            >
              {adminError}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void handleAdminLogin()}
            disabled={adminSubmitting}
            className="w-full rounded-2xl border-2 border-slate-300 bg-white px-6 py-4 text-lg font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {adminSubmitting ? "登入中..." : "管理員登入"}
          </button>
        </div>
      </div>
    </main>
  );
}

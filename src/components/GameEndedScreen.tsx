"use client";

import Link from "next/link";
import { signInWithPopup, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useStudent } from "@/contexts/StudentContext";
import { upsertAdminProfile } from "@/lib/admins";
import { verifyAdminAccess, formatAdminVerifyError } from "@/lib/adminApi";
import { googleAuthProvider, isGoogleUser } from "@/lib/adminClient";
import { getClientAuth } from "@/lib/firebaseClient";
import { APP_TITLE, EVENT_NAME } from "@/lib/appBranding";

export function GameEndedScreen() {
  const router = useRouter();
  const { authUser, loading } = useStudent();
  const [adminAuthorized, setAdminAuthorized] = useState<boolean | null>(null);
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!authUser || !isGoogleUser(authUser)) {
      setAdminAuthorized(false);
      return;
    }

    let cancelled = false;

    async function verifyAdmin() {
      try {
        const token = await authUser!.getIdToken();
        const result = await verifyAdminAccess(token);

        if (!cancelled) {
          setAdminAuthorized(result.ok);
        }
      } catch (verifyError) {
        console.error(verifyError);

        if (!cancelled) {
          setAdminAuthorized(false);
        }
      }
    }

    void verifyAdmin();

    return () => {
      cancelled = true;
    };
  }, [authUser, loading]);

  async function handleAdminLogin() {
    setAdminError(null);
    setAdminSubmitting(true);

    try {
      const credential = await signInWithPopup(getClientAuth(), googleAuthProvider);
      const token = await credential.user.getIdToken();
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
      setAdminError("無法使用 Google 登入，請再試一次。");
    } finally {
      setAdminSubmitting(false);
    }
  }

  const checkingAdmin = loading || adminAuthorized === null;

  return (
    <main className="flex flex-1 items-center justify-center py-8 sm:py-12">
      <div className="w-full max-w-lg rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-lg shadow-emerald-100/80 sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
          {APP_TITLE}
        </p>
        <p className="mt-1 text-base font-bold text-emerald-800">{EVENT_NAME}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          感謝你的參與！
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          活動已結束。希望你今天玩得開心，探索了不同的攤位和工作坊。
        </p>

        <div className="mt-8 space-y-3">
          {checkingAdmin ? (
            <p className="text-sm text-slate-500">正在確認管理員權限...</p>
          ) : adminAuthorized ? (
            <Link
              href="/admin/dashboard"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 px-6 py-5 text-xl font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
            >
              前往管理員控制台
            </Link>
          ) : (
            <>
              {adminError ? (
                <p
                  className="rounded-xl bg-red-50 px-4 py-3 text-base text-red-700"
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
            </>
          )}

          <Link
            href="/"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-sky-600 px-6 py-5 text-xl font-semibold text-white transition hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-200"
          >
            返回主頁
          </Link>
        </div>
      </div>
    </main>
  );
}

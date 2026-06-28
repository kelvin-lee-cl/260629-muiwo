"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ActivityLogTab } from "@/components/admin/ActivityLogTab";
import { EventControlsTab } from "@/components/admin/EventControlsTab";
import { LeaderboardTab } from "@/components/admin/LeaderboardTab";
import { ManageActivityTab } from "@/components/admin/ManageActivityTab";
import { PresenceBillboardTab } from "@/components/admin/PresenceBillboardTab";
import { StudentWorksTab } from "@/components/admin/StudentWorksTab";
import { useStudent } from "@/contexts/StudentContext";
import { verifyAdminAccess, formatAdminVerifyError } from "@/lib/adminApi";
import { isGoogleUser } from "@/lib/adminClient";
import type { AdminAccess } from "@/lib/adminRolesShared";
import { getClientAuth } from "@/lib/firebaseClient";
import { APP_NAME } from "@/lib/appBranding";

type DashboardTab =
  | "manage"
  | "works"
  | "leaderboard"
  | "activity"
  | "presence"
  | "controls";

const ALL_TABS: {
  id: DashboardTab;
  label: string;
  superOnly?: boolean;
}[] = [
  { id: "manage", label: "Manage Activity" },
  { id: "works", label: "Student Works" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "activity", label: "Activity Log" },
  { id: "presence", label: "Live Presence" },
  { id: "controls", label: "Event Controls", superOnly: true },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const { authUser, loading } = useStudent();
  const [activeTab, setActiveTab] = useState<DashboardTab>("manage");
  const [adminAccess, setAdminAccess] = useState<AdminAccess | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const visibleTabs = useMemo(() => {
    if (adminAccess?.role === "super") {
      return ALL_TABS;
    }

    return ALL_TABS.filter((tab) => !tab.superOnly);
  }, [adminAccess?.role]);

  const getToken = useCallback(async () => {
    if (!authUser) {
      throw new Error("Not signed in.");
    }

    return authUser.getIdToken();
  }, [authUser]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!authUser || !isGoogleUser(authUser)) {
      router.replace("/");
      return;
    }

    let cancelled = false;

    async function verifyAccess() {
      setChecking(true);

      try {
        const token = await authUser!.getIdToken();
        const result = await verifyAdminAccess(token);

        if (!cancelled) {
          if (result.ok) {
            setAdminAccess(result.access);
            setVerifyError(null);
          } else {
            setAdminAccess(null);
            setVerifyError(formatAdminVerifyError(result, authUser!.email));
          }
        }
      } catch (verifyError) {
        console.error(verifyError);

        if (!cancelled) {
          setAdminAccess(null);
          setVerifyError("無法連接伺服器以驗證管理員權限，請稍後再試。");
        }
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    }

    void verifyAccess();

    return () => {
      cancelled = true;
    };
  }, [authUser, loading, router]);

  useEffect(() => {
    if (!adminAccess) {
      return;
    }

    if (adminAccess.role !== "super" && activeTab === "controls") {
      setActiveTab("manage");
    }
  }, [activeTab, adminAccess]);

  async function handleLogout() {
    await signOut(getClientAuth());
    router.replace("/");
  }

  if (loading || checking) {
    return (
      <main className="flex flex-1 items-center justify-center py-12">
        <p className="text-xl text-slate-600">Loading admin dashboard...</p>
      </main>
    );
  }

  if (!authUser || !isGoogleUser(authUser)) {
    return null;
  }

  if (!adminAccess) {
    const isServerError = verifyError?.includes("伺服器");

    return (
      <main className="flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-lg rounded-2xl border border-red-100 bg-white p-8 text-center shadow-lg">
          <h1 className="text-3xl font-bold text-red-800">
            {isServerError ? "Server error" : "Access denied"}
          </h1>
          <p className="mt-3 text-lg text-slate-600">
            {verifyError ??
              "Your Google account is not authorized for admin access."}
          </p>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="mt-6 rounded-xl border border-slate-200 px-5 py-3 text-base font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Sign out and return home
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col bg-slate-100">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              {APP_NAME}
            </p>
            <h1 className="text-2xl font-bold text-slate-900">
              Admin Dashboard
            </h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="text-sm text-slate-600">
              <p>{authUser.email}</p>
              <p className="font-medium text-slate-500">
                {adminAccess.role === "super" ? "Super admin" : "Helper"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="rounded-xl border border-slate-200 px-5 py-3 text-base font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-slate-200 bg-white px-4 sm:px-6">
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto py-3">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 rounded-xl px-5 py-3 text-base font-semibold transition ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {activeTab === "manage" ? (
            <ManageActivityTab getToken={getToken} />
          ) : null}
          {activeTab === "works" ? (
            <StudentWorksTab getToken={getToken} />
          ) : null}
          {activeTab === "leaderboard" ? (
            <LeaderboardTab getToken={getToken} />
          ) : null}
          {activeTab === "activity" ? (
            <ActivityLogTab getToken={getToken} />
          ) : null}
          {activeTab === "presence" ? (
            <PresenceBillboardTab getToken={getToken} />
          ) : null}
          {activeTab === "controls" && adminAccess.role === "super" ? (
            <EventControlsTab getToken={getToken} />
          ) : null}
        </div>
      </div>
    </main>
  );
}

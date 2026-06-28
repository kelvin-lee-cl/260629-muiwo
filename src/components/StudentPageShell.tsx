"use client";

import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState, type ReactNode } from "react";

import { useStudent } from "@/contexts/StudentContext";
import { getClientDb } from "@/lib/firebaseClient";
import { formatPointsLabel } from "@/lib/studentUi";

type StudentPageShellProps = {
  children: ReactNode;
  refreshScoreKey?: string | number;
};

export function StudentPageShell({
  children,
  refreshScoreKey,
}: StudentPageShellProps) {
  const { authUser, studentId } = useStudent();
  const [totalPoints, setTotalPoints] = useState<number | null>(null);

  useEffect(() => {
    if (!authUser) {
      return;
    }

    let cancelled = false;

    async function loadPoints() {
      try {
        const snapshot = await getDoc(doc(getClientDb(), "students", authUser!.uid));

        if (!cancelled && snapshot.exists()) {
          const points = snapshot.data().totalPoints;
          setTotalPoints(typeof points === "number" ? points : 0);
        }
      } catch (error) {
        console.error(error);
      }
    }

    void loadPoints();

    return () => {
      cancelled = true;
    };
  }, [authUser, refreshScoreKey]);

  const scoreLabel =
    totalPoints === null ? "..." : formatPointsLabel(totalPoints);

  return (
    <main className="flex flex-1 flex-col gap-6 pb-8">
      <header className="rounded-3xl bg-gradient-to-r from-sky-500 via-purple-500 to-emerald-500 p-6 shadow-lg shadow-purple-200/60 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            歡迎，{studentId}！
          </h1>
          <p className="rounded-2xl bg-white/20 px-5 py-3 text-xl font-bold text-white backdrop-blur-sm sm:text-2xl">
            你的分數：{scoreLabel}
          </p>
        </div>
      </header>

      {children}

      <Link
        href="/dashboard"
        className="flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-4 text-lg font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
      >
        返回主頁
      </Link>
    </main>
  );
}

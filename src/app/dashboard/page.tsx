"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useStudent } from "@/contexts/StudentContext";
import type { BoothDocument, BoothType } from "@/lib/booths";
import { fetchAllBoothsFromFirestore } from "@/lib/boothsClient";
import {
  fetchStudentActivity,
  fetchStudentProfile,
  formatActivityTime,
  type StudentActivityEntry,
} from "@/lib/studentActivityClient";
import { startLeaderboardTop5Updates, getCachedLeaderboardTop5 } from "@/lib/leaderboardClient";
import type { LeaderboardDisplayEntry } from "@/lib/leaderboardTypes";
import { fetchStudentRank } from "@/lib/studentDashboardClient";
import { fetchEventStatus } from "@/lib/eventSettingsClient";
import { formatPointsLabel, studentBoothTypeLabel } from "@/lib/studentUi";
import { SlideCarousel } from "@/components/student/SlideCarousel";
// Fallback: fetchStudentLeaderboard loads all students via /api/student/leaderboard.

const ACTIVITY_LOG_VISIBLE_ROWS = 5;
// Header row + 5 data rows (~3rem each).
const ACTIVITY_LOG_MAX_HEIGHT = "max-h-[18.5rem]";

const DESTINATION_GROUP_ORDER: BoothType[] = ["booth", "workshop"];

export default function DashboardPage() {
  return <DashboardPageContent />;
}

function DashboardPageContent() {
  const router = useRouter();
  const { studentId, authUser, logout, isStudentSession } = useStudent();
  const [destinations, setDestinations] = useState<BoothDocument[]>([]);
  const [destinationsLoading, setDestinationsLoading] = useState(true);
  const [selectedDestination, setSelectedDestination] = useState("");
  const [totalPoints, setTotalPoints] = useState<number | null>(null);
  const [leaderboardEntries, setLeaderboardEntries] = useState<
    LeaderboardDisplayEntry[]
  >(() => getCachedLeaderboardTop5() ?? []);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [totalStudents, setTotalStudents] = useState(0);
  const [leaderboardLoading, setLeaderboardLoading] = useState(
    () => getCachedLeaderboardTop5() === null,
  );
  const [activityLog, setActivityLog] = useState<StudentActivityEntry[]>([]);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const isLoggedIn = isStudentSession;

  const groupedDestinations = useMemo(() => {
    return DESTINATION_GROUP_ORDER.map((type) => ({
      type,
      label: studentBoothTypeLabel(type),
      booths: destinations.filter((booth) => booth.type === type),
    })).filter((group) => group.booths.length > 0);
  }, [destinations]);

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    let cancelled = false;

    async function loadDestinations() {
      setDestinationsLoading(true);

      try {
        const booths = await fetchAllBoothsFromFirestore();

        if (!cancelled) {
          setDestinations(booths);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) {
          setDestinationsLoading(false);
        }
      }
    }

    void loadDestinations();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!authUser || !isLoggedIn) {
      return;
    }

    const unsubscribe = startLeaderboardTop5Updates({
      getToken: () => authUser.getIdToken(),
      onUpdate: (entries) => {
        setLeaderboardEntries(entries);
        setLeaderboardLoading(false);
      },
      onError: () => {
        setLeaderboardLoading(false);
      },
    });

    return unsubscribe;
  }, [authUser, isLoggedIn]);

  useEffect(() => {
    if (!authUser || !isLoggedIn) {
      return;
    }

    let cancelled = false;

    async function loadDashboardData() {
      setDashboardLoading(true);

      try {
        const token = await authUser!.getIdToken();
        const [profile, rankSummary, activity, eventStatus] = await Promise.all([
          fetchStudentProfile(authUser!.uid),
          fetchStudentRank(token),
          fetchStudentActivity(authUser!.uid),
          fetchEventStatus(),
        ]);

        // Fallback: replace fetchStudentRank with fetchStudentLeaderboard(token)
        // to load top 5 and rank from the server in one request.

        if (!cancelled) {
          setTotalPoints(profile.totalPoints);
          setMyRank(rankSummary.myRank);
          setTotalStudents(rankSummary.totalStudents);
          setActivityLog(activity);
          setGalleryImages(eventStatus.galleryImages);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) {
          setDashboardLoading(false);
        }
      }
    }

    void loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, [authUser, isLoggedIn]);

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  function handleVisitDestination() {
    if (!selectedDestination) {
      return;
    }

    const destination = destinations.find(
      (entry) => entry.id === selectedDestination,
    );

    if (destination?.type === "workshop") {
      router.push(`/workshop/${selectedDestination}`);
      return;
    }

    router.push(`/booth/${selectedDestination}`);
  }

  const scoreLabel =
    dashboardLoading || totalPoints === null ? "..." : formatPointsLabel(totalPoints);

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

      <section className="rounded-3xl border border-purple-100 bg-white p-6 shadow-lg shadow-purple-100/80">
        <h2 className="text-2xl font-bold text-purple-950 sm:text-3xl">排行榜</h2>
        {leaderboardLoading ? (
          <p className="mt-4 text-lg text-slate-600">載入排行榜中...</p>
        ) : leaderboardEntries.length > 0 ? (
          <>
            <ul className="mt-4 space-y-3">
              {leaderboardEntries.map((entry) => {
                const isCurrentStudent = entry.studentId === studentId;

                return (
                  <li
                    key={entry.rank}
                    className={`flex items-center justify-between rounded-2xl px-4 py-4 text-lg sm:text-xl ${
                      isCurrentStudent
                        ? "bg-purple-100 font-bold text-purple-900 ring-2 ring-purple-300"
                        : "bg-slate-50 text-slate-800"
                    }`}
                  >
                    <span>
                      #{entry.rank} {entry.studentId}
                      {isCurrentStudent ? "（你）" : ""}
                    </span>
                    <span className="font-semibold">{formatPointsLabel(entry.totalPoints)}</span>
                  </li>
                );
              })}
            </ul>
            {myRank !== null ? (
              <p className="mt-5 text-center text-lg font-semibold text-purple-800 sm:text-xl">
                我的排名：第 {myRank} 名／共 {totalStudents} 位同學
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-4 text-lg text-slate-600">
            暫時未有分數。前往攤位即可上榜！
          </p>
        )}
      </section>

      <section className="rounded-3xl border border-sky-100 bg-white p-6 shadow-lg shadow-sky-100/80">
        <h2 className="text-2xl font-bold text-sky-950 sm:text-3xl">
          前往攤位或工作坊
        </h2>
        <p className="mt-2 text-base text-slate-600">
          攤位需輸入 3 位數密碼。工作坊可直接進入。
        </p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row">
          <select
            value={selectedDestination}
            onChange={(event) => setSelectedDestination(event.target.value)}
            disabled={destinationsLoading || destinations.length === 0}
            className="w-full rounded-2xl border border-sky-200 bg-sky-50/50 px-4 py-4 text-lg font-medium text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1 sm:text-xl"
          >
            <option value="">
              {destinationsLoading
                ? "載入地點中..."
                : destinations.length === 0
                  ? "暫時未有攤位"
                  : "選擇攤位或工作坊..."}
            </option>
            {groupedDestinations.map((group) => (
              <optgroup key={group.type} label={group.label}>
                {group.booths.map((booth) => (
                  <option key={booth.id} value={booth.id}>
                    {booth.id} · {booth.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button
            type="button"
            disabled={!selectedDestination || destinationsLoading}
            onClick={handleVisitDestination}
            className="rounded-2xl bg-sky-600 px-8 py-4 text-xl font-bold text-white transition hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            前往
          </button>
        </div>
      </section>

      <div className="flex flex-col gap-4">
        <Link
          href="/checkpoint"
          className="flex items-center justify-center rounded-3xl border-2 border-emerald-300 bg-emerald-50 px-6 py-6 text-xl font-bold text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-100 focus:outline-none focus:ring-4 focus:ring-emerald-100 sm:text-2xl"
        >
          輸入關卡密碼
        </Link>
      </div>

      <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-lg shadow-emerald-100/80">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-2xl font-bold text-emerald-950 sm:text-3xl">
            活動紀錄
          </h2>
          {!dashboardLoading && activityLog.length > ACTIVITY_LOG_VISIBLE_ROWS ? (
            <p className="text-sm font-medium text-emerald-700">
              顯示最近 {ACTIVITY_LOG_VISIBLE_ROWS} 項 · 向下捲動查看更多
            </p>
          ) : null}
        </div>
        <div
          className={`mt-4 rounded-2xl border border-emerald-100 ${
            !dashboardLoading && activityLog.length > 0
              ? `${ACTIVITY_LOG_MAX_HEIGHT} overflow-y-auto`
              : ""
          }`}
        >
          {dashboardLoading ? (
            <p className="px-4 py-5 text-center text-base text-slate-600">
              載入活動紀錄中...
            </p>
          ) : activityLog.length === 0 ? (
            <p className="px-4 py-5 text-center text-base text-slate-600">
              尚未有攤位紀錄。掃描 QR 碼開始賺取分數！
            </p>
          ) : (
            <table className="w-full text-left text-base sm:text-lg">
              <thead className="sticky top-0 z-10 bg-emerald-50 shadow-sm">
                <tr>
                  <th className="px-4 py-3 font-semibold text-emerald-900">時間</th>
                  <th className="px-4 py-3 font-semibold text-emerald-900">
                    活動
                  </th>
                  <th className="px-4 py-3 font-semibold text-emerald-900">分數</th>
                </tr>
              </thead>
              <tbody>
                {activityLog.map((entry, index) => (
                  <tr
                    key={`${entry.boothId}-${entry.timestampMs ?? index}`}
                    className={
                      index % 2 === 0 ? "bg-white" : "bg-emerald-50/60"
                    }
                  >
                    <td className="px-4 py-3 font-medium text-slate-600">
                      {formatActivityTime(entry.timestampMs)}
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      已領取 {entry.boothTitle}
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-600">
                      +{formatPointsLabel(entry.pointsAwarded)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {galleryImages.length > 0 ? (
        <SlideCarousel
          slides={galleryImages}
          title="活動相簿"
          counterLabel="圖片"
          className=""
        />
      ) : null}

      <button
        type="button"
        onClick={() => void handleLogout()}
        className="w-full rounded-2xl border border-slate-200 bg-white px-6 py-4 text-lg font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
      >
        登出
      </button>
    </main>
  );
}

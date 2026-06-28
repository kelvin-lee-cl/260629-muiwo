"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchAdminStudents } from "@/lib/adminApi";
import { ONLINE_THRESHOLD_MS, isStudentOnline } from "@/lib/studentPresence";
import {
  dedupeStudentsForPresence,
  type StudentSummary,
} from "@/lib/studentsAdminShared";

const REFRESH_INTERVAL_MS = 30_000;

type PresenceBillboardTabProps = {
  getToken: () => Promise<string>;
};

function PresenceDot({ online }: { online: boolean }) {
  return (
    <span
      className={`inline-block h-3 w-3 shrink-0 rounded-full sm:h-3.5 sm:w-3.5 ${
        online
          ? "bg-emerald-400 shadow-[0_0_10px_2px_rgba(52,211,153,0.75)] animate-pulse"
          : "bg-slate-600"
      }`}
      aria-hidden="true"
    />
  );
}

export function PresenceBillboardTab({ getToken }: PresenceBillboardTabProps) {
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [classFilter, setClassFilter] = useState("");
  const [tick, setTick] = useState(0);

  const loadStudents = useCallback(async () => {
    const token = await getToken();
    return fetchAdminStudents(token);
  }, [getToken]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      setError(null);

      try {
        const data = await loadStudents();
        if (!cancelled) {
          setStudents(data);
          setLastUpdated(new Date());
        }
      } catch (loadError) {
        if (!cancelled) {
          console.error(loadError);
          setError("Could not load student presence.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void bootstrap();

    const refreshId = window.setInterval(() => {
      void loadStudents()
        .then((data) => {
          if (!cancelled) {
            setStudents(data);
            setLastUpdated(new Date());
          }
        })
        .catch((refreshError) => {
          console.error(refreshError);
        });
    }, REFRESH_INTERVAL_MS);

    const tickId = window.setInterval(() => {
      setTick((current) => current + 1);
    }, 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshId);
      window.clearInterval(tickId);
    };
  }, [loadStudents]);

  const uniqueStudents = useMemo(
    () => dedupeStudentsForPresence(students),
    [students],
  );

  const classOptions = useMemo(() => {
    const classes = new Set(
      uniqueStudents.map((student) => student.class).filter(Boolean),
    );
    return [...classes].sort();
  }, [uniqueStudents]);

  const filteredStudents = useMemo(() => {
    if (!classFilter) {
      return uniqueStudents;
    }

    return uniqueStudents.filter((student) => student.class === classFilter);
  }, [classFilter, uniqueStudents]);

  const onlineCount = useMemo(() => {
    void tick;

    return filteredStudents.filter((student) =>
      isStudentOnline(student.lastSeenMs),
    ).length;
  }, [filteredStudents, tick]);

  if (loading) {
    return <p className="text-lg text-slate-600">Loading presence board...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Live Presence</h2>
          <p className="mt-1 text-slate-600">
            Green dot = on site (seen within{" "}
            {Math.round(ONLINE_THRESHOLD_MS / 60_000)} min). Refreshes every
            30 seconds.
          </p>
          {lastUpdated ? (
            <p className="mt-1 text-sm text-slate-500">
              Last updated {lastUpdated.toLocaleTimeString()}
            </p>
          ) : null}
        </div>

        <label className="block w-full lg:w-48">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Filter by class
          </span>
          <select
            value={classFilter}
            onChange={(event) => setClassFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">All classes</option>
            {classOptions.map((className) => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-inner">
        <div className="border-b border-slate-800 bg-slate-900 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <p className="text-lg font-bold text-emerald-400 sm:text-xl">
              {onlineCount} online
            </p>
            <p className="text-lg font-bold text-slate-400 sm:text-xl">
              {filteredStudents.length - onlineCount} offline
            </p>
            <p className="text-sm font-medium text-slate-500">
              {filteredStudents.length} students shown
            </p>
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <p className="px-6 py-16 text-center text-lg text-slate-500">
            No students registered yet.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-px bg-slate-800 p-px sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {filteredStudents.map((student) => {
              const online = isStudentOnline(student.lastSeenMs);

              return (
                <li
                  key={student.authUid}
                  className="flex items-center gap-2 bg-slate-950 px-3 py-3 sm:gap-2.5 sm:px-4 sm:py-3.5"
                  title={
                    online
                      ? `${student.studentId} is online`
                      : `${student.studentId} is offline`
                  }
                >
                  <PresenceDot online={online} />
                  <span
                    className={`truncate font-mono text-sm font-bold tracking-wide sm:text-base ${
                      online ? "text-emerald-100" : "text-slate-500"
                    }`}
                  >
                    {student.studentId}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

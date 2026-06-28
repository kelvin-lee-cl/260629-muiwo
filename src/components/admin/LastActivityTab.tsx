"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchAdminActivity } from "@/lib/adminApi";
import {
  formatVisitTimestamp,
  type VisitSummary,
} from "@/lib/visitsShared";

type LastActivityTabProps = {
  getToken: () => Promise<string>;
  embedded?: boolean;
};

export function LastActivityTab({
  getToken,
  embedded = false,
}: LastActivityTabProps) {
  const [visits, setVisits] = useState<VisitSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadActivity = useCallback(async () => {
    const token = await getToken();
    return fetchAdminActivity(token);
  }, [getToken]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      setError(null);

      try {
        const data = await loadActivity();

        if (!cancelled) {
          setVisits(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          console.error(loadError);
          setError("Could not load activity.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [loadActivity]);

  if (loading) {
    return <p className="text-lg text-slate-600">Loading activity...</p>;
  }

  return (
    <div className="space-y-6">
      {embedded ? null : (
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Last Activity</h2>
          <p className="mt-1 text-slate-600">
            Most recent booth visits across the event.
          </p>
        </div>
      )}

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="max-h-[32rem] overflow-y-auto rounded-2xl border border-slate-200 bg-white">
        {visits.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-lg font-medium text-slate-700">No activity yet</p>
            <p className="mt-2 text-sm text-slate-500">
              Visit records will appear here when students claim booth codes.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {visits.map((visit) => (
              <li
                key={`${visit.studentId}-${visit.boothId}-${visit.timestampMs ?? visit.authUid}`}
                className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {visit.studentId} · {visit.boothTitle}
                  </p>
                  <p className="text-sm text-slate-500">
                    {formatVisitTimestamp(visit.timestampMs)}
                  </p>
                </div>
                <span className="text-base font-medium text-blue-700">
                  +{visit.pointsAwarded} pts
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

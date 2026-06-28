"use client";

import { useState } from "react";

import { LastActivityTab } from "@/components/admin/LastActivityTab";
import { ScoreboardTab } from "@/components/admin/ScoreboardTab";

type ActivityLogView = "scoreboard" | "recent";

const VIEWS: { id: ActivityLogView; label: string }[] = [
  { id: "scoreboard", label: "Scoreboard Log" },
  { id: "recent", label: "Last Activity" },
];

type ActivityLogTabProps = {
  getToken: () => Promise<string>;
};

export function ActivityLogTab({ getToken }: ActivityLogTabProps) {
  const [view, setView] = useState<ActivityLogView>("scoreboard");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Activity Log</h2>
          <p className="mt-1 text-slate-600">
            Review student scores or recent booth visits.
          </p>
        </div>

        <label className="w-full sm:w-72">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Log view
          </span>
          <select
            value={view}
            onChange={(event) =>
              setView(event.target.value as ActivityLogView)
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-medium text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            {VIEWS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {view === "scoreboard" ? (
        <ScoreboardTab getToken={getToken} embedded />
      ) : null}
      {view === "recent" ? (
        <LastActivityTab getToken={getToken} embedded />
      ) : null}
    </div>
  );
}

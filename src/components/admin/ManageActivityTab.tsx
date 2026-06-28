"use client";

import { useState } from "react";

import { ManageBoothsTab } from "@/components/admin/ManageBoothsTab";
import { ManageCheckpointsTab } from "@/components/admin/ManageCheckpointsTab";
import { ManageWorkshopsTab } from "@/components/admin/ManageWorkshopsTab";

type ManageActivityView = "booths" | "checkpoints" | "workshops";

const VIEWS: { id: ManageActivityView; label: string }[] = [
  { id: "booths", label: "Manage Booths" },
  { id: "checkpoints", label: "Manage Checkpoints" },
  { id: "workshops", label: "Manage Workshops" },
];

type ManageActivityTabProps = {
  getToken: () => Promise<string>;
};

export function ManageActivityTab({ getToken }: ManageActivityTabProps) {
  const [view, setView] = useState<ManageActivityView>("booths");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Manage Activity</h2>
          <p className="mt-1 text-slate-600">
            Configure booths, checkpoints, and workshops.
          </p>
        </div>

        <label className="w-full sm:w-72">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Activity type
          </span>
          <select
            value={view}
            onChange={(event) =>
              setView(event.target.value as ManageActivityView)
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

      {view === "booths" ? (
        <ManageBoothsTab getToken={getToken} embedded />
      ) : null}
      {view === "checkpoints" ? (
        <ManageCheckpointsTab getToken={getToken} embedded />
      ) : null}
      {view === "workshops" ? (
        <ManageWorkshopsTab getToken={getToken} embedded />
      ) : null}
    </div>
  );
}

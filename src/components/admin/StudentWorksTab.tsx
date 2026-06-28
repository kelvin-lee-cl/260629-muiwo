"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchAdminWorks } from "@/lib/adminApi";
import {
  STUDENT_WORK_FEATURES,
  STUDENT_WORK_SORT_OPTIONS,
  filterAndSortStudentWorks,
  formatStudentWorkTime,
  studentWorkFeatureLabel,
  type StudentWorkDocument,
  type StudentWorkSort,
} from "@/lib/studentWorksShared";
import type { BoothFeature } from "@/lib/booths";

type StudentWorksTabProps = {
  getToken: () => Promise<string>;
};

export function StudentWorksTab({ getToken }: StudentWorksTabProps) {
  const [feature, setFeature] = useState<BoothFeature>("text-to-image");
  const [works, setWorks] = useState<StudentWorkDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentQuery, setStudentQuery] = useState("");
  const [venueFilter, setVenueFilter] = useState("all");
  const [venueTypeFilter, setVenueTypeFilter] = useState<
    "all" | "booth" | "workshop" | "checkpoint"
  >("all");
  const [sort, setSort] = useState<StudentWorkSort>("newest");

  const loadWorks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const data = await fetchAdminWorks(token);
      setWorks(data);
    } catch (loadError) {
      console.error(loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load student works.",
      );
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void loadWorks();
  }, [loadWorks]);

  const featureWorks = useMemo(
    () => works.filter((work) => work.feature === feature),
    [feature, works],
  );

  const venueOptions = useMemo(() => {
    const venueIds = new Set(featureWorks.map((work) => work.venueId));
    return [...venueIds].sort();
  }, [featureWorks]);

  useEffect(() => {
    if (venueFilter !== "all" && !venueOptions.includes(venueFilter)) {
      setVenueFilter("all");
    }
  }, [venueFilter, venueOptions]);

  const filteredWorks = useMemo(
    () =>
      filterAndSortStudentWorks(
        works,
        {
          feature,
          venueId: venueFilter,
          venueType: venueTypeFilter,
          studentQuery,
        },
        sort,
      ),
    [feature, sort, studentQuery, venueFilter, venueTypeFilter, works],
  );

  const hasActiveFilters =
    studentQuery.trim().length > 0 ||
    venueFilter !== "all" ||
    venueTypeFilter !== "all";

  function clearFilters() {
    setStudentQuery("");
    setVenueFilter("all");
    setVenueTypeFilter("all");
    setSort("newest");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Student Works</h2>
          <p className="mt-1 text-slate-600">
            Review saved activity from booth and workshop feature sections.
          </p>
        </div>

        <label className="w-full sm:w-72">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Feature section
          </span>
          <select
            value={feature}
            onChange={(event) => setFeature(event.target.value as BoothFeature)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-medium text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            {STUDENT_WORK_FEATURES.map((option) => (
              <option key={option} value={option}>
                {studentWorkFeatureLabel(option)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {STUDENT_WORK_FEATURES.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFeature(option)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              feature === option
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {studentWorkFeatureLabel(option)}
          </button>
        ))}
      </div>

      {!loading && featureWorks.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block sm:col-span-2 lg:col-span-1">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Search student ID
              </span>
              <input
                type="search"
                value={studentQuery}
                onChange={(event) => setStudentQuery(event.target.value)}
                placeholder="e.g. 1A03"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Venue
              </span>
              <select
                value={venueFilter}
                onChange={(event) => setVenueFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="all">All venues</option>
                {venueOptions.map((venueId) => (
                  <option key={venueId} value={venueId}>
                    {venueId}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Venue type
              </span>
              <select
                value={venueTypeFilter}
                onChange={(event) =>
                  setVenueTypeFilter(
                    event.target.value as
                      | "all"
                      | "booth"
                      | "workshop"
                      | "checkpoint",
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="all">All types</option>
                <option value="booth">Booths</option>
                <option value="workshop">Workshops</option>
                <option value="checkpoint">Checkpoints</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Sort by
              </span>
              <select
                value={sort}
                onChange={(event) =>
                  setSort(event.target.value as StudentWorkSort)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                {STUDENT_WORK_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-600">
              Showing {filteredWorks.length} of {featureWorks.length}{" "}
              {studentWorkFeatureLabel(feature).toLowerCase()} work
              {featureWorks.length === 1 ? "" : "s"}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-base text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-lg text-slate-600">Loading student works...</p>
      ) : featureWorks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
          <p className="text-lg font-semibold text-slate-700">
            No works yet for {studentWorkFeatureLabel(feature)}.
          </p>
          <p className="mt-2 text-base text-slate-600">
            Student submissions will appear here after they complete booth or
            workshop activities.
          </p>
        </div>
      ) : filteredWorks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
          <p className="text-lg font-semibold text-slate-700">
            No works match your filters.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-4 rounded-xl bg-blue-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-blue-700"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredWorks.map((work) => (
            <StudentWorkCard key={work.id} work={work} />
          ))}
        </div>
      )}
    </div>
  );
}

function StudentWorkCard({ work }: { work: StudentWorkDocument }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
          {work.studentId}
        </span>
        <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700">
          {work.venueId} · {work.venueType}
        </span>
        <span className="text-sm text-slate-500">
          {formatStudentWorkTime(work.createdAtMs)}
        </span>
      </div>

      {work.prompt ? (
        <p className="mt-4 text-base text-slate-700">
          <span className="font-semibold text-slate-900">Prompt:</span>{" "}
          {work.prompt}
        </p>
      ) : null}

      {work.generatedText ? (
        <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-slate-700">
          {work.generatedText}
        </p>
      ) : null}

      {work.submissionText ? (
        <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-slate-700">
          {work.submissionText}
        </p>
      ) : null}

      {work.submissionUrl ? (
        <p className="mt-3 text-base text-slate-700">
          <span className="font-semibold text-slate-900">Link:</span>{" "}
          <a
            href={work.submissionUrl}
            target="_blank"
            rel="noreferrer"
            className="break-all text-blue-700 underline"
          >
            {work.submissionUrl}
          </a>
        </p>
      ) : null}

      {work.imageUrl ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <Image
            src={work.imageUrl}
            alt={`Work by ${work.studentId}`}
            width={640}
            height={360}
            unoptimized={work.imageUrl.startsWith("data:")}
            className="h-auto w-full object-contain"
          />
        </div>
      ) : null}

      {work.videoUrl ? (
        <p className="mt-3 rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-900">
          Video: {work.videoUrl}
        </p>
      ) : null}
    </article>
  );
}

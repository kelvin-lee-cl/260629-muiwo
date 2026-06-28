"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import { SlideCarousel } from "@/components/student/SlideCarousel";
import { bulkAwardBoothPoints, fetchBoothHelperData } from "@/lib/adminApi";
import {
  boothTypeLabel,
  normalizePosterImageUrl,
  type BoothDocument,
} from "@/lib/booths";
import { boothTypeStyles } from "@/lib/boothStyles";
import {
  formatHelperVisitTime,
  type HelperCompletedVisit,
  type HelperStudent,
} from "@/lib/boothHelperShared";

type BoothHelperPanelProps = {
  booth: BoothDocument;
  getToken: () => Promise<string>;
  onBack: () => void;
};

export function BoothHelperPanel({
  booth,
  getToken,
  onBack,
}: BoothHelperPanelProps) {
  const [completedVisits, setCompletedVisits] = useState<HelperCompletedVisit[]>(
    [],
  );
  const [pendingStudents, setPendingStudents] = useState<HelperStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const loadHelperData = useCallback(async () => {
    const token = await getToken();
    return fetchBoothHelperData(token, booth.id);
  }, [booth.id, getToken]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      setError(null);

      try {
        const data = await loadHelperData();

        if (!cancelled) {
          setCompletedVisits(data.completedVisits);
          setPendingStudents(data.pendingStudents);
        }
      } catch (loadError) {
        if (!cancelled) {
          console.error(loadError);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load student data for this activity.",
          );
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
  }, [loadHelperData]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toast]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return pendingStudents;
    }

    return pendingStudents.filter(
      (student) =>
        student.studentId.toLowerCase().includes(query) ||
        student.class.toLowerCase().includes(query),
    );
  }, [pendingStudents, search]);

  const allFilteredSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((student) => selectedIds.has(student.studentId));

  function toggleStudent(studentId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }

      return next;
    });
  }

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds((current) => {
        const next = new Set(current);
        for (const student of filteredStudents) {
          next.delete(student.studentId);
        }
        return next;
      });
      return;
    }

    setSelectedIds((current) => {
      const next = new Set(current);
      for (const student of filteredStudents) {
        next.add(student.studentId);
      }
      return next;
    });
  }

  async function handleAwardPoints() {
    if (submitting || selectedIds.size === 0) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const token = await getToken();
      const result = await bulkAwardBoothPoints(token, booth.id, [
        ...selectedIds,
      ]);

      const data = await loadHelperData();
      setCompletedVisits(data.completedVisits);
      setPendingStudents(data.pendingStudents);
      setSelectedIds(new Set());

      if (result.awardedCount === 0) {
        setToast("No students were awarded. They may have already completed this activity.");
      } else {
        setToast(
          `Points awarded to ${result.awardedCount} student${result.awardedCount === 1 ? "" : "s"}!`,
        );
      }
    } catch (awardError) {
      console.error(awardError);
      setError(
        awardError instanceof Error
          ? awardError.message
          : "Could not award points.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-lg text-slate-600">Loading helper panel...</p>;
  }

  return (
    <div className="space-y-8">
      {toast ? (
        <div
          className="fixed inset-x-4 top-4 z-50 mx-auto max-w-3xl rounded-2xl bg-emerald-600 px-6 py-4 text-center text-lg font-semibold text-white shadow-lg"
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-4 min-h-12 rounded-xl border border-slate-200 px-5 py-3 text-base font-semibold text-slate-700 active:bg-slate-50"
          >
            ← Back to list
          </button>

          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Helper bulk select
          </p>
          <h2 className="mt-1 text-3xl font-bold text-slate-900">{booth.title}</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-sm font-medium text-slate-600">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-800">
              {boothTypeLabel(booth.type)} {booth.id}
            </span>
            {booth.type !== "workshop" ? (
              <span className="rounded-full bg-purple-100 px-3 py-1 text-purple-800">
                Code {booth.code}
              </span>
            ) : null}
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">
              {booth.points} pts each
            </span>
            {booth.helperName ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                Helper: {booth.helperName}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <AdminVenuePreview booth={booth} />

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h3 className="text-xl font-bold text-slate-900">
          Completed visits ({completedVisits.length})
        </h3>
        <p className="mt-1 text-slate-600">
          Students who have already received points at this activity.
        </p>

        {completedVisits.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-slate-600">
            No completed visits yet.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-700">
                    Student ID
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-700">
                    Class
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-700">
                    Points
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-700">
                    Completed at
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {completedVisits.map((visit) => (
                  <tr key={`${visit.studentId}-${visit.timestampMs ?? visit.authUid}`}>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {visit.studentId}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{visit.class}</td>
                    <td className="px-4 py-3 font-medium text-emerald-700">
                      +{visit.points}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatHelperVisitTime(visit.timestampMs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 sm:p-6">
        <h3 className="text-xl font-bold text-slate-900">Bulk award points</h3>
        <p className="mt-1 text-slate-600">
          Select logged-in students who have not completed this activity yet.
        </p>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="sr-only">Search students by ID or class</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by student ID or class..."
              className="w-full rounded-2xl border-2 border-slate-200 bg-white px-5 py-4 text-lg text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-base font-medium text-slate-700">
              {selectedIds.size} selected · {filteredStudents.length} pending ·{" "}
              {pendingStudents.length} logged in
            </p>
            <button
              type="button"
              onClick={toggleSelectAll}
              disabled={filteredStudents.length === 0}
              className="min-h-12 rounded-2xl border-2 border-purple-200 bg-purple-50 px-6 py-3 text-base font-semibold text-purple-800 active:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {allFilteredSelected ? "Deselect All" : "Select All"}
            </button>
          </div>
        </div>

        <ul className="mt-5 space-y-3">
          {filteredStudents.length === 0 ? (
            <li className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-10 text-center text-lg text-slate-600">
              {pendingStudents.length === 0
                ? completedVisits.length === 0
                  ? "No students have logged in yet."
                  : "All logged-in students have completed this activity."
                : "No students match your search."}
            </li>
          ) : (
            filteredStudents.map((student) => (
              <PendingStudentRow
                key={student.studentId}
                student={student}
                checked={selectedIds.has(student.studentId)}
                onToggle={() => toggleStudent(student.studentId)}
              />
            ))
          )}
        </ul>

        <button
          type="button"
          onClick={() => void handleAwardPoints()}
          disabled={submitting || selectedIds.size === 0}
          className={`mt-6 w-full min-h-14 rounded-2xl px-6 py-5 text-xl font-bold text-white shadow-lg active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${
            submitting ? "bg-slate-500" : "bg-emerald-600 active:bg-emerald-700"
          }`}
        >
          {submitting
            ? "Awarding..."
            : `Award Points to Selected (${selectedIds.size})`}
        </button>
      </section>
    </div>
  );
}

function AdminVenuePreview({ booth }: { booth: BoothDocument }) {
  const posterImageUrl = normalizePosterImageUrl(booth.posterImageUrl);
  const styles = boothTypeStyles[booth.type];
  const slides = booth.workshopSlides ?? [];
  const hasDescription = booth.description.trim().length > 0;
  const hasSlides = slides.some((slide) => slide.trim().length > 0);

  if (!posterImageUrl && !hasDescription && !hasSlides) {
    return null;
  }

  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h3 className="text-xl font-bold text-slate-900">Activity preview</h3>

      {hasDescription ? (
        <p className="whitespace-pre-wrap text-base leading-relaxed text-slate-700">
          {booth.description}
        </p>
      ) : null}

      {posterImageUrl ? (
        <div
          className={`overflow-hidden rounded-2xl border ${styles.posterFrame}`}
        >
          <Image
            src={posterImageUrl}
            alt={`${booth.title} poster`}
            width={960}
            height={540}
            className="h-auto w-full object-cover"
            priority
          />
        </div>
      ) : null}

      {hasSlides ? (
        <SlideCarousel
          slides={slides}
          title="Workshop slides"
          counterLabel="Slide"
          className="mt-0"
        />
      ) : null}
    </section>
  );
}

type PendingStudentRowProps = {
  student: HelperStudent;
  checked: boolean;
  onToggle: () => void;
};

function PendingStudentRow({
  student,
  checked,
  onToggle,
}: PendingStudentRowProps) {
  return (
    <li>
      <label className="flex min-h-12 cursor-pointer items-center gap-4 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 active:bg-blue-50 sm:px-5 sm:py-4">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="h-6 w-6 shrink-0 rounded-md border-2 border-slate-300 text-blue-600 focus:ring-4 focus:ring-blue-100"
        />
        <span className="flex flex-1 items-center justify-between gap-4">
          <span className="text-lg font-bold text-slate-900">
            {student.studentId}
          </span>
          <span className="rounded-full bg-purple-100 px-4 py-1 text-sm font-semibold text-purple-800">
            Class {student.class}
          </span>
        </span>
      </label>
    </li>
  );
}

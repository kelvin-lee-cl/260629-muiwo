"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { fetchAdminActivity, fetchAdminStudents } from "@/lib/adminApi";
import {
  dedupeStudentsByStudentId,
  type StudentSummary,
} from "@/lib/studentsAdminShared";
import {
  formatVisitTimestamp,
  type VisitSummary,
} from "@/lib/visitsShared";

type ScoreboardTabProps = {
  getToken: () => Promise<string>;
  embedded?: boolean;
};

export function ScoreboardTab({
  getToken,
  embedded = false,
}: ScoreboardTabProps) {
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [visits, setVisits] = useState<VisitSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(
    null,
  );

  const loadData = useCallback(async () => {
    const token = await getToken();
    const [studentData, visitData] = await Promise.all([
      fetchAdminStudents(token),
      fetchAdminActivity(token),
    ]);

    return { studentData, visitData };
  }, [getToken]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      setError(null);

      try {
        const { studentData, visitData } = await loadData();
        if (!cancelled) {
          setStudents(studentData);
          setVisits(visitData);
        }
      } catch (loadError) {
        if (!cancelled) {
          console.error(loadError);
          setError("Could not load scoreboard.");
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
  }, [loadData]);

  const uniqueStudents = useMemo(
    () =>
      dedupeStudentsByStudentId(students).sort((left, right) =>
        left.studentId.localeCompare(right.studentId),
      ),
    [students],
  );

  const visitsByStudentId = useMemo(() => {
    const grouped = new Map<string, VisitSummary[]>();

    for (const visit of visits) {
      const existing = grouped.get(visit.studentId) ?? [];
      existing.push(visit);
      grouped.set(visit.studentId, existing);
    }

    for (const [studentId, studentVisits] of grouped) {
      grouped.set(
        studentId,
        studentVisits.sort(
          (left, right) => (right.timestampMs ?? 0) - (left.timestampMs ?? 0),
        ),
      );
    }

    return grouped;
  }, [visits]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return uniqueStudents;
    }

    return uniqueStudents.filter(
      (student) =>
        student.studentId.toLowerCase().includes(query) ||
        student.class.toLowerCase().includes(query),
    );
  }, [search, uniqueStudents]);

  if (loading) {
    return <p className="text-lg text-slate-600">Loading scoreboard...</p>;
  }

  return (
    <div className="space-y-6">
      {embedded ? null : (
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Scoreboard Log</h2>
          <p className="mt-1 text-slate-600">
            All registered students and their progress.
          </p>
        </div>
      )}

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <label className="block">
        <span className="sr-only">Search by student ID or class</span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by student ID or class..."
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </label>

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
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
                Visited Count
              </th>
              <th className="px-4 py-3 text-sm font-semibold text-slate-700">
                Activity
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredStudents.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-slate-600"
                >
                  {uniqueStudents.length === 0
                    ? "No students registered yet."
                    : "No students match your search."}
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => {
                const isExpanded = expandedStudentId === student.studentId;
                const studentVisits =
                  visitsByStudentId.get(student.studentId) ?? [];

                return (
                  <Fragment key={student.studentId}>
                    <tr className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {student.studentId}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {student.class}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {student.totalPoints}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {student.visitedCount}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedStudentId(
                              isExpanded ? null : student.studentId,
                            )
                          }
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          {isExpanded ? "Hide log" : "View log"}
                        </button>
                      </td>
                    </tr>
                    {isExpanded ? (
                      <tr>
                        <td colSpan={5} className="bg-slate-50 px-4 py-4">
                          {studentVisits.length === 0 ? (
                            <p className="text-sm text-slate-600">
                              No activity yet.
                            </p>
                          ) : (
                            <ul className="space-y-2">
                              {studentVisits.map((visit) => (
                                <li
                                  key={`${visit.boothId}-${visit.timestampMs ?? visit.authUid}`}
                                  className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                                >
                                  <span className="font-medium">
                                    {visit.boothTitle}
                                  </span>
                                  {" · "}
                                  {visit.pointsAwarded} pts ·{" "}
                                  {formatVisitTimestamp(visit.timestampMs)}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

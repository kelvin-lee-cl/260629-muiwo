"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchAdminStudents } from "@/lib/adminApi";
import { dedupeStudentsByStudentId } from "@/lib/studentsAdminShared";
import type { StudentSummary } from "@/lib/studentsAdminShared";

type RankedStudent = StudentSummary & { rank: number };

type LeaderboardTabProps = {
  getToken: () => Promise<string>;
};

function rankStudents(students: StudentSummary[]): RankedStudent[] {
  return dedupeStudentsByStudentId(students)
    .sort((left, right) => {
      if (right.totalPoints !== left.totalPoints) {
        return right.totalPoints - left.totalPoints;
      }

      return left.studentId.localeCompare(right.studentId);
    })
    .map((student, index) => ({
      ...student,
      rank: index + 1,
    }));
}

function rankBadgeClass(rank: number): string {
  if (rank === 1) {
    return "bg-amber-100 text-amber-900 ring-amber-200";
  }

  if (rank === 2) {
    return "bg-slate-200 text-slate-800 ring-slate-300";
  }

  if (rank === 3) {
    return "bg-orange-100 text-orange-900 ring-orange-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export function LeaderboardTab({ getToken }: LeaderboardTabProps) {
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState("");

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
        }
      } catch (loadError) {
        if (!cancelled) {
          console.error(loadError);
          setError("Could not load leaderboard.");
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
  }, [loadStudents]);

  const classOptions = useMemo(() => {
    const classes = new Set(students.map((student) => student.class).filter(Boolean));
    return [...classes].sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (!classFilter) {
      return students;
    }

    return students.filter((student) => student.class === classFilter);
  }, [classFilter, students]);

  const rankedStudents = useMemo(
    () => rankStudents(filteredStudents),
    [filteredStudents],
  );

  if (loading) {
    return <p className="text-lg text-slate-600">Loading leaderboard...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Leaderboard</h2>
          <p className="mt-1 text-slate-600">
            Students ranked by total points
            {classFilter ? ` in class ${classFilter}` : ""}.
          </p>
        </div>

        <label className="block w-full sm:w-56">
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

      <p className="rounded-xl bg-blue-50 px-4 py-3 text-base font-medium text-blue-900">
        {rankedStudents.length} student
        {rankedStudents.length === 1 ? "" : "s"} ranked
      </p>

      {rankedStudents.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center text-lg text-slate-600">
          No students on the leaderboard yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {rankedStudents.map((student) => (
            <li
              key={student.authUid}
              className={`flex items-center justify-between rounded-2xl border px-4 py-4 sm:px-5 ${
                student.rank <= 3
                  ? "border-slate-200 bg-white shadow-sm"
                  : "border-slate-100 bg-slate-50/80"
              }`}
            >
              <div className="flex items-center gap-4">
                <span
                  className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold ring-2 ${rankBadgeClass(student.rank)}`}
                >
                  #{student.rank}
                </span>
                <div>
                  <p className="text-lg font-bold text-slate-900">
                    {student.studentId}
                  </p>
                  <p className="text-sm text-slate-500">
                    Class {student.class} · {student.visitedCount} booth
                    {student.visitedCount === 1 ? "" : "s"} visited
                  </p>
                </div>
              </div>

              <p className="text-xl font-bold text-blue-700">
                {student.totalPoints} pts
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

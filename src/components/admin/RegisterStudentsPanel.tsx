"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  bulkRegisterAdminStudents,
  deleteAdminClassStudents,
  deleteAdminStudent,
  fetchAdminStudents,
  type ClassRegistrationInput,
} from "@/lib/adminApi";
import type { StudentSummary } from "@/lib/studentsAdminShared";
import { isValidClassCode, normalizeClassCode } from "@/lib/studentId";

type RegisterStudentsPanelProps = {
  getToken: () => Promise<string>;
  onMessage: (message: string) => void;
  onError: (message: string | null) => void;
};

type ClassRow = {
  key: string;
  classCode: string;
  maxStudents: string;
};

function createRow(): ClassRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    classCode: "",
    maxStudents: "30",
  };
}

function groupStudentsByClass(students: StudentSummary[]) {
  const grouped = new Map<string, StudentSummary[]>();

  for (const student of students) {
    const classCode = student.class || student.studentId.slice(0, 2);
    const existing = grouped.get(classCode) ?? [];
    existing.push(student);
    grouped.set(classCode, existing);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([classCode, classStudents]) => ({
      classCode,
      students: classStudents.sort((left, right) =>
        left.studentId.localeCompare(right.studentId),
      ),
    }));
}

export function RegisterStudentsPanel({
  getToken,
  onMessage,
  onError,
}: RegisterStudentsPanelProps) {
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [classRows, setClassRows] = useState<ClassRow[]>([createRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  const [deletingClassCode, setDeletingClassCode] = useState<string | null>(
    null,
  );
  const [expandedClassCode, setExpandedClassCode] = useState<string | null>(
    null,
  );

  const groupedClasses = useMemo(
    () => groupStudentsByClass(students),
    [students],
  );

  const loadStudents = useCallback(async () => {
    setLoadingStudents(true);

    try {
      const token = await getToken();
      const rows = await fetchAdminStudents(token);
      setStudents(rows);
    } catch (loadError) {
      console.error(loadError);
      onError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load registered students.",
      );
    } finally {
      setLoadingStudents(false);
    }
  }, [getToken, onError]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  function updateClassRow(
    key: string,
    field: "classCode" | "maxStudents",
    value: string,
  ) {
    setClassRows((current) =>
      current.map((row) =>
        row.key === key
          ? {
              ...row,
              [field]:
                field === "classCode"
                  ? normalizeClassCode(value).slice(0, 2)
                  : value.replace(/\D/g, "").slice(0, 2),
            }
          : row,
      ),
    );
  }

  function addClassRow() {
    setClassRows((current) => [...current, createRow()]);
  }

  function removeClassRow(key: string) {
    setClassRows((current) =>
      current.length === 1
        ? current
        : current.filter((row) => row.key !== key),
    );
  }

  async function handleRegisterStudents() {
    const payload: ClassRegistrationInput[] = [];

    for (const row of classRows) {
      const classCode = normalizeClassCode(row.classCode);
      const maxStudents = Number.parseInt(row.maxStudents, 10);

      if (!isValidClassCode(classCode)) {
        onError(`Invalid class "${row.classCode}". Use format like P1, 1A, 4D, K2, or K3.`);
        return;
      }

      if (!Number.isInteger(maxStudents) || maxStudents < 1 || maxStudents > 99) {
        onError(`Max students for ${classCode} must be between 1 and 99.`);
        return;
      }

      payload.push({ classCode, maxStudents });
    }

    const duplicateClasses = payload.filter(
      (entry, index) =>
        payload.findIndex((other) => other.classCode === entry.classCode) !==
        index,
    );

    if (duplicateClasses.length > 0) {
      onError("Each class can only appear once in the batch.");
      return;
    }

    setSubmitting(true);
    onError(null);

    try {
      const token = await getToken();
      const result = await bulkRegisterAdminStudents(token, payload);

      const parts: string[] = [];

      if (result.added.length > 0) {
        parts.push(
          `Registered ${result.added.length} student${result.added.length === 1 ? "" : "s"}.`,
        );
      }

      if (result.skipped.length > 0) {
        parts.push(
          `Skipped ${result.skipped.length} existing student${result.skipped.length === 1 ? "" : "s"}.`,
        );
      }

      if (result.invalidClasses.length > 0) {
        parts.push(
          `${result.invalidClasses.length} class row${result.invalidClasses.length === 1 ? "" : "s"} invalid.`,
        );
      }

      onMessage(parts.join(" ") || "No students were added.");
      setShowRegisterDialog(false);
      setClassRows([createRow()]);
      await loadStudents();
    } catch (registerError) {
      console.error(registerError);
      onError(
        registerError instanceof Error
          ? registerError.message
          : "Could not register students.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteStudent(studentId: string) {
    setDeletingStudentId(studentId);
    onError(null);

    try {
      const token = await getToken();
      const result = await deleteAdminStudent(token, studentId);
      if (result.studentsDeleted === 0) {
        onMessage(`No record found for ${studentId}.`);
      } else {
        onMessage(`Deleted ${studentId} and related activity.`);
      }
      await loadStudents();
    } catch (deleteError) {
      console.error(deleteError);
      onError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete student.",
      );
    } finally {
      setDeletingStudentId(null);
    }
  }

  async function handleDeleteClass(classCode: string) {
    const confirmed = window.confirm(
      `Delete all students in class ${classCode}? This removes their visits, points, and saved works.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingClassCode(classCode);
    onError(null);

    try {
      const token = await getToken();
      const result = await deleteAdminClassStudents(token, classCode);
      onMessage(
        `Deleted ${result.studentsDeleted} student${result.studentsDeleted === 1 ? "" : "s"} from class ${classCode}.`,
      );
      await loadStudents();
    } catch (deleteError) {
      console.error(deleteError);
      onError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete class.",
      );
    } finally {
      setDeletingClassCode(null);
    }
  }

  return (
    <>
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Register students</h3>
            <p className="mt-2 text-slate-600">
              Pre-register whole classes so student IDs like 1A01 appear in
              Leaderboard and admin views. They stay offline in Live Presence
              until they sign in on a device.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowRegisterDialog(true);
              onError(null);
            }}
            disabled={submitting}
            className="shrink-0 rounded-xl bg-emerald-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Add classes
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {loadingStudents ? (
            <p className="text-sm text-slate-500">Loading registered students...</p>
          ) : groupedClasses.length === 0 ? (
            <p className="text-sm text-slate-500">No students registered yet.</p>
          ) : (
            groupedClasses.map(({ classCode, students: classStudents }) => {
              const expanded = expandedClassCode === classCode;

              return (
                <div
                  key={classCode}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedClassCode(expanded ? null : classCode)
                      }
                      className="text-left"
                    >
                      <p className="text-lg font-bold text-slate-900">
                        Class {classCode}
                      </p>
                      <p className="text-sm text-slate-500">
                        {classStudents.length} student
                        {classStudents.length === 1 ? "" : "s"}
                      </p>
                    </button>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedClassCode(expanded ? null : classCode)
                        }
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        {expanded ? "Hide" : "View"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteClass(classCode)}
                        disabled={deletingClassCode === classCode}
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingClassCode === classCode
                          ? "Deleting..."
                          : "Delete class"}
                      </button>
                    </div>
                  </div>

                  {expanded ? (
                    <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                      {classStudents.map((student) => (
                        <li
                          key={`${student.authUid}-${student.studentId}`}
                          className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                        >
                          <div>
                            <p className="font-mono text-sm font-semibold text-slate-800">
                              {student.studentId}
                            </p>
                            <p className="text-xs text-slate-500">
                              {student.totalPoints} pts · {student.visitedCount}{" "}
                              visits
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              void handleDeleteStudent(student.studentId)
                            }
                            disabled={deletingStudentId === student.studentId}
                            className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingStudentId === student.studentId
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>

      {showRegisterDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-emerald-200 bg-white p-6 shadow-xl"
            role="dialog"
            aria-labelledby="register-students-dialog-title"
            aria-modal="true"
          >
            <h3
              id="register-students-dialog-title"
              className="text-2xl font-bold text-slate-900"
            >
              Add classes
            </h3>
            <p className="mt-3 text-slate-600">
              Enter each class (e.g. P1, P2, 1A, K2) and how many students to
              create. IDs are generated automatically as P101, 1A01, K201, and so on.
            </p>

            <div className="mt-6 space-y-3">
              {classRows.map((row) => (
                <div
                  key={row.key}
                  className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_1fr_auto]"
                >
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">
                      Class
                    </span>
                    <input
                      type="text"
                      value={row.classCode}
                      onChange={(event) =>
                        updateClassRow(row.key, "classCode", event.target.value)
                      }
                      placeholder="P1 / 1A"
                      maxLength={2}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-base uppercase outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">
                      Max students
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={row.maxStudents}
                      onChange={(event) =>
                        updateClassRow(
                          row.key,
                          "maxStudents",
                          event.target.value,
                        )
                      }
                      placeholder="30"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeClassRow(row.key)}
                      disabled={classRows.length === 1}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addClassRow}
              className="mt-4 rounded-xl border border-dashed border-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
            >
              + Add another class
            </button>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowRegisterDialog(false)}
                disabled={submitting}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-base font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleRegisterStudents()}
                disabled={submitting}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Adding..." : "Add students"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

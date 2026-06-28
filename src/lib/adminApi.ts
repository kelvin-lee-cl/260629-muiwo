import type {
  AdminAccess,
  AdminAccessResult,
  AdminRole,
  AdminVerifyFailureReason,
} from "@/lib/adminRolesShared";
import type { BoothInput } from "@/lib/booths";
import type { BoothDocument } from "@/lib/booths";
import {
  DELETE_ALL_BOOTHS_PHRASE,
  DELETE_ALL_STUDENT_WORKS_PHRASE,
  RESET_CONFIRMATION_PHRASE,
  type EventSettings,
} from "@/lib/eventSettingsShared";
import type { StudentSummary } from "@/lib/studentsAdminShared";
import type { BoothHelperData } from "@/lib/boothHelperShared";
import type { StudentWorkDocument } from "@/lib/studentWorksShared";
import type { VisitSummary } from "@/lib/visitsShared";
import type { BoothFeature } from "@/lib/booths";

export {
  DELETE_ALL_BOOTHS_PHRASE,
  DELETE_ALL_STUDENT_WORKS_PHRASE,
  RESET_CONFIRMATION_PHRASE,
};

function adminHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function parseError(response: Response): Promise<string> {
  const fallback = `Request failed (${response.status}).`;

  try {
    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
      return fallback;
    }

    const body = (await response.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}

async function adminFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  attempt = 0,
): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (error instanceof TypeError && attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 750));
      return adminFetch(input, init, 1);
    }

    if (error instanceof TypeError) {
      throw new Error(
        "Could not reach the server. Run `npm run dev` and open http://localhost:3001 (this app does not use port 3000). If the dev server is running, try disabling ad blockers for this site.",
      );
    }

    throw error;
  }
}

export type { AdminAccess, AdminAccessResult, AdminRole };

function classifyVerifyFailure(status: number): AdminVerifyFailureReason {
  if (status === 401 || status === 403) {
    return "unauthorized";
  }

  return "server_error";
}

export function formatAdminVerifyError(
  result: Extract<AdminAccessResult, { ok: false }>,
  email?: string | null,
): string {
  if (result.reason === "server_error") {
    return "伺服器暫時無法驗證管理員權限。請在 Vercel 確認已設定 FIREBASE_SERVICE_ACCOUNT_KEY 及 ADMIN_SUPER_EMAILS，然後重新部署。你也可以開啟 /api/health 檢查設定。";
  }

  if (result.reason === "invalid_response") {
    return "伺服器回應異常，無法確認管理員權限。請稍後再試。";
  }

  return `你的 Google 帳戶（${email ?? "未知"}）未獲授權使用管理員功能。`;
}

export async function verifyAdminAccess(
  token: string,
): Promise<AdminAccessResult> {
  const response = await adminFetch("/api/admin/verify", {
    method: "GET",
    headers: adminHeaders(token),
  });

  if (!response.ok) {
    return {
      ok: false,
      reason: classifyVerifyFailure(response.status),
      status: response.status,
    };
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return { ok: false, reason: "server_error", status: response.status };
  }

  const body = (await response.json()) as {
    role?: AdminRole;
    email?: string;
  };

  if (body.role !== "super" && body.role !== "helper") {
    return { ok: false, reason: "invalid_response", status: response.status };
  }

  return {
    ok: true,
    access: {
      role: body.role,
      email: body.email ?? "",
    },
  };
}

export async function fetchAdminBooths(
  token: string,
): Promise<BoothDocument[]> {
  const response = await adminFetch("/api/admin/booths", {
    headers: adminHeaders(token),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const body = (await response.json()) as { booths: BoothDocument[] };
  return body.booths;
}

export async function createAdminBooth(
  token: string,
  input: BoothInput,
): Promise<BoothDocument> {
  const response = await adminFetch("/api/admin/booths", {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const body = (await response.json()) as { booth: BoothDocument };
  return body.booth;
}

export async function updateAdminBooth(
  token: string,
  boothId: string,
  input: BoothInput,
): Promise<BoothDocument> {
  const response = await adminFetch(`/api/admin/booths/${boothId}`, {
    method: "PUT",
    headers: adminHeaders(token),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const body = (await response.json()) as { booth: BoothDocument };
  return body.booth;
}

export async function deleteAdminBooth(
  token: string,
  boothId: string,
): Promise<void> {
  const response = await adminFetch(`/api/admin/booths/${boothId}`, {
    method: "DELETE",
    headers: adminHeaders(token),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function fetchAdminStudents(
  token: string,
): Promise<StudentSummary[]> {
  const response = await fetch("/api/admin/verify?resource=students", {
    headers: adminHeaders(token),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const body = (await response.json()) as { students: StudentSummary[] };
  return body.students;
}

export async function fetchAdminEventSettings(
  token: string,
): Promise<EventSettings> {
  const response = await fetch("/api/admin/event", {
    headers: adminHeaders(token),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as EventSettings;
}

export async function updateAdminEventFrozen(
  token: string,
  frozen: boolean,
): Promise<EventSettings> {
  const response = await fetch("/api/admin/event", {
    method: "PUT",
    headers: adminHeaders(token),
    body: JSON.stringify({ frozen }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as EventSettings;
}

export async function updateAdminProjectNotes(
  token: string,
  projectNotes: string,
): Promise<EventSettings> {
  const response = await fetch("/api/admin/event", {
    method: "PATCH",
    headers: adminHeaders(token),
    body: JSON.stringify({ projectNotes }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as EventSettings;
}

export async function updateAdminGalleryImages(
  token: string,
  galleryImages: string[],
): Promise<EventSettings> {
  const response = await fetch("/api/admin/event", {
    method: "PATCH",
    headers: adminHeaders(token),
    body: JSON.stringify({ galleryImages }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as EventSettings;
}

export async function resetAdminEventData(
  token: string,
  confirmation: string,
): Promise<{
  success: boolean;
  studentsDeleted: number;
  visitsDeleted: number;
  rateLimitsDeleted: number;
}> {
  const response = await fetch("/api/admin/reset", {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify({ confirmation }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as {
    success: boolean;
    studentsDeleted: number;
    visitsDeleted: number;
    rateLimitsDeleted: number;
  };
}

function downloadBlobFile(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadCsvFile(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportAdminEventData(token: string): Promise<void> {
  const response = await fetch("/api/admin/export?type=both", {
    headers: adminHeaders(token),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const body = (await response.json()) as {
    scoresCsv: string;
    activityCsv: string;
  };

  downloadCsvFile("stem-adventure-scores.csv", body.scoresCsv);
  downloadCsvFile("stem-adventure-activity.csv", body.activityCsv);
}

export async function exportAdminStudentWorks(token: string): Promise<void> {
  const response = await fetch("/api/admin/works/export", {
    headers: adminHeaders(token),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const blob = await response.blob();
  downloadBlobFile("stem-adventure-student-works.zip", blob);
}

export async function fetchAdminActivity(
  token: string,
): Promise<VisitSummary[]> {
  const response = await fetch("/api/admin/activity", {
    headers: adminHeaders(token),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const body = (await response.json()) as { visits: VisitSummary[] };
  return body.visits;
}

export async function deleteAdminBooths(
  token: string,
  confirmation: string,
): Promise<{ success: boolean; boothsDeleted: number }> {
  const response = await fetch("/api/admin/booths/delete-all", {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify({ confirmation }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as {
    success: boolean;
    boothsDeleted: number;
  };
}

export async function fetchBoothHelperData(
  token: string,
  boothId: string,
): Promise<BoothHelperData> {
  const response = await adminFetch(
    `/api/admin/booths/${encodeURIComponent(boothId)}/student-visits`,
    {
      headers: adminHeaders(token),
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as BoothHelperData;
}

export async function deleteAdminStudentWorks(
  token: string,
  confirmation: string,
): Promise<{ success: boolean; worksDeleted: number }> {
  const response = await fetch("/api/admin/works/delete-all", {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify({ confirmation }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as {
    success: boolean;
    worksDeleted: number;
  };
}

export async function fetchAdminWorks(
  token: string,
  feature?: BoothFeature,
): Promise<StudentWorkDocument[]> {
  const query = feature ? `?feature=${encodeURIComponent(feature)}` : "";
  const response = await fetch(`/api/admin/works${query}`, {
    headers: adminHeaders(token),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const body = (await response.json()) as { works: StudentWorkDocument[] };
  return body.works;
}

export async function bulkAwardBoothPoints(
  token: string,
  boothId: string,
  studentIds: string[],
): Promise<{
  success: boolean;
  awardedCount: number;
  skippedCount: number;
  pointsPerStudent: number;
}> {
  const response = await fetch(`/api/admin/booths/${boothId}/bulk-award`, {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify({ studentIds }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as {
    success: boolean;
    awardedCount: number;
    skippedCount: number;
    pointsPerStudent: number;
  };
}

export type AdminHelperSummary = {
  email: string;
  addedAt: string | null;
  addedBy: string;
};

export async function fetchAdminHelpers(
  token: string,
): Promise<AdminHelperSummary[]> {
  const response = await adminFetch("/api/admin/helpers", {
    headers: adminHeaders(token),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const body = (await response.json()) as { helpers: AdminHelperSummary[] };
  return body.helpers;
}

export async function addAdminHelpers(
  token: string,
  emails: string,
): Promise<{
  added: string[];
  skipped: string[];
  invalid: string[];
  helpers: AdminHelperSummary[];
}> {
  const response = await adminFetch("/api/admin/helpers", {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify({ emails }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as {
    added: string[];
    skipped: string[];
    invalid: string[];
    helpers: AdminHelperSummary[];
  };
}

export async function removeAdminHelper(
  token: string,
  email: string,
): Promise<AdminHelperSummary[]> {
  const response = await adminFetch(
    `/api/admin/helpers?email=${encodeURIComponent(email)}`,
    {
      method: "DELETE",
      headers: adminHeaders(token),
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const body = (await response.json()) as { helpers: AdminHelperSummary[] };
  return body.helpers;
}

export type ClassRegistrationInput = {
  classCode: string;
  maxStudents: number;
};

export type BulkRegisterStudentsResult = {
  added: string[];
  skipped: string[];
  invalidClasses: Array<{ classCode: string; reason: string }>;
};

export type DeleteStudentDataResult = {
  studentIds: string[];
  studentsDeleted: number;
  visitsDeleted: number;
  rateLimitsDeleted: number;
  worksDeleted: number;
  authUsersDeleted: number;
};

export async function bulkRegisterAdminStudents(
  token: string,
  classes: ClassRegistrationInput[],
): Promise<BulkRegisterStudentsResult> {
  const response = await adminFetch("/api/admin/students/bulk", {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify({ classes }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as BulkRegisterStudentsResult;
}

export async function deleteAdminStudent(
  token: string,
  studentId: string,
): Promise<DeleteStudentDataResult> {
  const response = await adminFetch(
    `/api/admin/students/${encodeURIComponent(studentId)}`,
    {
      method: "DELETE",
      headers: adminHeaders(token),
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as DeleteStudentDataResult;
}

export async function deleteAdminClassStudents(
  token: string,
  classCode: string,
): Promise<DeleteStudentDataResult> {
  const response = await adminFetch(
    `/api/admin/students/class/${encodeURIComponent(classCode)}`,
    {
      method: "DELETE",
      headers: adminHeaders(token),
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as DeleteStudentDataResult;
}

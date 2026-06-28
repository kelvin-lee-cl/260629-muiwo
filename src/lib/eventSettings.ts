import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebaseAdmin";
import { refreshLeaderboardTop5 } from "@/lib/leaderboard";
import { listBooths } from "@/lib/boothsAdmin";
import {
  RESET_CONFIRMATION_PHRASE,
  type EventSettings,
} from "@/lib/eventSettingsShared";
import { listStudents } from "@/lib/studentsAdmin";
import type { VisitSummary } from "@/lib/visitsShared";

const EVENT_SETTINGS_DOC = "settings/event";
const EVENT_PUBLIC_STATUS_DOC = "event/status";

export { RESET_CONFIRMATION_PHRASE, type EventSettings };
export type { VisitSummary };

function parseTimestampMs(data: Record<string, unknown>): number | null {
  const timestamp = data.timestamp;

  if (
    timestamp &&
    typeof timestamp === "object" &&
    "toMillis" in timestamp &&
    typeof timestamp.toMillis === "function"
  ) {
    return timestamp.toMillis();
  }

  return null;
}

export async function getEventSettings(): Promise<EventSettings> {
  const snapshot = await getAdminDb().doc(EVENT_SETTINGS_DOC).get();

  if (!snapshot.exists) {
    return { frozen: false, projectNotes: "", galleryImages: [] };
  }

  const data = snapshot.data();
  return {
    frozen: data?.frozen === true,
    projectNotes:
      typeof data?.projectNotes === "string" ? data.projectNotes : "",
    galleryImages: parseGalleryImages(data?.galleryImages),
  };
}

function parseGalleryImages(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export async function isEventFrozen(): Promise<boolean> {
  const settings = await getEventSettings();
  return settings.frozen;
}

async function syncPublicEventStatus(frozen: boolean): Promise<void> {
  await getAdminDb().doc(EVENT_PUBLIC_STATUS_DOC).set(
    {
      frozen,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function syncPublicEventStatusIfNeeded(
  frozen: boolean,
): Promise<void> {
  const snapshot = await getAdminDb().doc(EVENT_PUBLIC_STATUS_DOC).get();

  if (snapshot.exists && snapshot.data()?.frozen === frozen) {
    return;
  }

  await syncPublicEventStatus(frozen);
}

export async function setEventFrozen(frozen: boolean): Promise<EventSettings> {
  await Promise.all([
    getAdminDb().doc(EVENT_SETTINGS_DOC).set(
      {
        frozen,
        updatedAt: FieldValue.serverTimestamp(),
        ...(frozen ? { frozenAt: FieldValue.serverTimestamp() } : {}),
      },
      { merge: true },
    ),
    syncPublicEventStatus(frozen),
  ]);

  return getEventSettings();
}

export async function setProjectNotes(
  projectNotes: string,
): Promise<EventSettings> {
  await getAdminDb().doc(EVENT_SETTINGS_DOC).set(
    {
      projectNotes,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const settings = await getEventSettings();
  return settings;
}

export async function setGalleryImages(
  galleryImages: string[],
): Promise<EventSettings> {
  const normalized = galleryImages
    .map((url) => url.trim())
    .filter(Boolean);

  await getAdminDb().doc(EVENT_SETTINGS_DOC).set(
    {
      galleryImages: normalized,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return getEventSettings();
}

export async function listVisits(): Promise<VisitSummary[]> {
  const [visitSnapshot, booths] = await Promise.all([
    getAdminDb().collection("visits").get(),
    listBooths(),
  ]);

  const boothTitleById = new Map(booths.map((booth) => [booth.id, booth.title]));

  return visitSnapshot.docs
    .map((doc) => {
      const data = doc.data();

      const boothId = typeof data.boothId === "string" ? data.boothId : "";

      return {
        studentId: typeof data.studentId === "string" ? data.studentId : "",
        boothId,
        boothTitle: boothTitleById.get(boothId) ?? boothId,
        authUid: typeof data.authUid === "string" ? data.authUid : "",
        pointsAwarded:
          typeof data.pointsAwarded === "number" ? data.pointsAwarded : 0,
        timestampMs: parseTimestampMs(data),
      };
    })
    .filter((visit) => visit.studentId && visit.boothId)
    .sort((left, right) => {
      const leftTime = left.timestampMs ?? 0;
      const rightTime = right.timestampMs ?? 0;
      return rightTime - leftTime;
    });
}

async function deleteCollection(collectionName: string): Promise<number> {
  const snapshot = await getAdminDb().collection(collectionName).get();

  if (snapshot.empty) {
    return 0;
  }

  let deleted = 0;
  const docs = snapshot.docs;

  for (let index = 0; index < docs.length; index += 500) {
    const batch = getAdminDb().batch();
    const chunk = docs.slice(index, index + 500);

    for (const doc of chunk) {
      batch.delete(doc.ref);
      deleted += 1;
    }

    await batch.commit();
  }

  return deleted;
}

export async function resetAllEventData(): Promise<{
  studentsDeleted: number;
  visitsDeleted: number;
  rateLimitsDeleted: number;
}> {
  const [studentsDeleted, visitsDeleted, rateLimitsDeleted] = await Promise.all([
    deleteCollection("students"),
    deleteCollection("visits"),
    deleteCollection("rateLimits"),
  ]);

  await Promise.all([setEventFrozen(false), refreshLeaderboardTop5()]);

  return {
    studentsDeleted,
    visitsDeleted,
    rateLimitsDeleted,
  };
}

function escapeCsvValue(value: string | number): string {
  const text = String(value);

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function formatTimestamp(timestampMs: number | null): string {
  if (timestampMs === null) {
    return "";
  }

  return new Date(timestampMs).toISOString();
}

export async function buildScoresCsv(): Promise<string> {
  const students = await listStudents();
  const header = "studentId,class,number,totalPoints,visitedCount,lastSeen";
  const rows = students.map((student) =>
    [
      escapeCsvValue(student.studentId),
      escapeCsvValue(student.class),
      escapeCsvValue(student.number),
      escapeCsvValue(student.totalPoints),
      escapeCsvValue(student.visitedCount),
      escapeCsvValue(formatTimestamp(student.lastSeenMs)),
    ].join(","),
  );

  return [header, ...rows].join("\n");
}

export async function buildActivityCsv(): Promise<string> {
  const visits = await listVisits();
  const header = "studentId,boothId,boothTitle,pointsAwarded,timestamp";
  const rows = visits.map((visit) =>
    [
      escapeCsvValue(visit.studentId),
      escapeCsvValue(visit.boothId),
      escapeCsvValue(visit.boothTitle),
      escapeCsvValue(visit.pointsAwarded),
      escapeCsvValue(formatTimestamp(visit.timestampMs)),
    ].join(","),
  );

  return [header, ...rows].join("\n");
}

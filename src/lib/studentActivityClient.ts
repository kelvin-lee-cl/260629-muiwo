"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { fetchAllBoothsFromFirestore } from "@/lib/boothsClient";
import { getClientDb } from "@/lib/firebaseClient";

export type StudentActivityEntry = {
  boothId: string;
  boothTitle: string;
  pointsAwarded: number;
  timestampMs: number | null;
};

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

export async function fetchStudentProfile(
  authUid: string,
): Promise<{ totalPoints: number }> {
  const snapshot = await getDoc(doc(getClientDb(), "students", authUid));

  if (!snapshot.exists()) {
    return { totalPoints: 0 };
  }

  const points = snapshot.data().totalPoints;
  return {
    totalPoints: typeof points === "number" ? points : 0,
  };
}

export async function fetchStudentActivity(
  authUid: string,
): Promise<StudentActivityEntry[]> {
  const [visitSnapshot, booths] = await Promise.all([
    getDocs(query(collection(getClientDb(), "visits"), where("authUid", "==", authUid))),
    fetchAllBoothsFromFirestore(),
  ]);

  const boothTitleById = new Map(booths.map((booth) => [booth.id, booth.title]));

  return visitSnapshot.docs
    .map((visitDoc) => {
      const data = visitDoc.data();
      const boothId = typeof data.boothId === "string" ? data.boothId : "";

      return {
        boothId,
        boothTitle: boothTitleById.get(boothId) ?? boothId,
        pointsAwarded:
          typeof data.pointsAwarded === "number" ? data.pointsAwarded : 0,
        timestampMs: parseTimestampMs(data),
      };
    })
    .sort((left, right) => {
      const leftTime = left.timestampMs ?? 0;
      const rightTime = right.timestampMs ?? 0;
      return rightTime - leftTime;
    });
}

export function formatActivityTime(timestampMs: number | null): string {
  if (timestampMs === null) {
    return "—";
  }

  return new Intl.DateTimeFormat("zh-HK", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestampMs));
}

"use client";

import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect } from "react";

import { getClientDb } from "@/lib/firebaseClient";
import { ONLINE_THRESHOLD_MS } from "@/lib/studentPresence";

export const HEARTBEAT_INTERVAL_MS = 60_000;
export { ONLINE_THRESHOLD_MS };

export async function updateStudentLastSeen(authUid: string): Promise<void> {
  await setDoc(
    doc(getClientDb(), "students", authUid),
    { lastSeen: serverTimestamp() },
    { merge: true },
  );
}

export function useStudentHeartbeat(authUid: string | null | undefined): void {
  useEffect(() => {
    if (!authUid) {
      return;
    }

    const uid = authUid;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    function writeHeartbeat() {
      void updateStudentLastSeen(uid).catch((error) => {
        console.error("Failed to update lastSeen heartbeat", error);
      });
    }

    function startInterval() {
      if (intervalId !== null) {
        return;
      }

      intervalId = setInterval(writeHeartbeat, HEARTBEAT_INTERVAL_MS);
    }

    function stopInterval() {
      if (intervalId === null) {
        return;
      }

      clearInterval(intervalId);
      intervalId = null;
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        writeHeartbeat();
        startInterval();
      } else {
        stopInterval();
      }
    }

    writeHeartbeat();

    if (document.visibilityState === "visible") {
      startInterval();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopInterval();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [authUid]);
}

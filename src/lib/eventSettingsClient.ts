import { FirebaseError } from "firebase/app";
import { doc, getDoc, onSnapshot, type Unsubscribe } from "firebase/firestore";

import { getClientDb } from "@/lib/firebaseClient";

export type EventStatus = {
  frozen: boolean;
  galleryImages: string[];
};

export const EVENT_STATUS_POLL_MS = 3_000;

const EVENT_PUBLIC_STATUS_DOC = "event/status";

export async function fetchEventStatus(): Promise<EventStatus> {
  const response = await fetch("/api/event/status", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Could not load event status.");
  }

  return (await response.json()) as EventStatus;
}

export function parseEventFrozen(snapshotData: unknown): boolean {
  if (!snapshotData || typeof snapshotData !== "object") {
    return false;
  }

  return (snapshotData as { frozen?: unknown }).frozen === true;
}

export async function canReadEventFrozenDoc(): Promise<boolean> {
  try {
    await getDoc(doc(getClientDb(), EVENT_PUBLIC_STATUS_DOC));
    return true;
  } catch (error) {
    if (isEventStatusPermissionError(error)) {
      return false;
    }

    throw error;
  }
}

export function subscribeEventFrozen(
  onUpdate: (frozen: boolean) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(getClientDb(), EVENT_PUBLIC_STATUS_DOC),
    (snapshot) => {
      if (!snapshot.exists()) {
        return;
      }

      onUpdate(parseEventFrozen(snapshot.data()));
    },
    (error) => {
      if (!isEventStatusPermissionError(error)) {
        console.error(error);
      }

      onError?.(error);
    },
  );
}

export function isEventStatusPermissionError(error: unknown): boolean {
  return (
    error instanceof FirebaseError && error.code === "permission-denied"
  );
}

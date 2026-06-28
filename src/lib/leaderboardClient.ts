"use client";

import { FirebaseError } from "firebase/app";
import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";

import { getClientDb } from "@/lib/firebaseClient";
import type { LeaderboardDisplayEntry } from "@/lib/leaderboardTypes";
import { parseTop5Document } from "@/lib/leaderboardShared";

const LEADERBOARD_POLL_MS = 30_000;

let cachedTop5Entries: LeaderboardDisplayEntry[] | null = null;

export function getCachedLeaderboardTop5(): LeaderboardDisplayEntry[] | null {
  return cachedTop5Entries;
}

export async function fetchLeaderboardTop5(
  token: string,
): Promise<LeaderboardDisplayEntry[]> {
  const response = await fetch("/api/student/leaderboard/top5", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Could not load leaderboard.");
  }

  const data = (await response.json()) as { entries?: LeaderboardDisplayEntry[] };
  return Array.isArray(data.entries) ? data.entries : [];
}

export function subscribeLeaderboardTop5(
  onUpdate: (entries: LeaderboardDisplayEntry[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(getClientDb(), "leaderboard", "top5"),
    (snapshot) => {
      onUpdate(parseTop5Document(snapshot.data()));
    },
    (error) => {
      console.error(error);
      onError?.(error);
    },
  );
}

export function isLeaderboardPermissionError(error: unknown): boolean {
  return (
    error instanceof FirebaseError && error.code === "permission-denied"
  );
}

export function startLeaderboardTop5Updates(params: {
  getToken: () => Promise<string>;
  onUpdate: (entries: LeaderboardDisplayEntry[]) => void;
  onError?: (error: Error) => void;
}): () => void {
  let cancelled = false;
  let pollId: ReturnType<typeof setInterval> | null = null;
  let unsubscribeSnapshot: Unsubscribe | null = null;

  function stopPolling() {
    if (pollId === null) {
      return;
    }

    clearInterval(pollId);
    pollId = null;
  }

  function deliverUpdate(entries: LeaderboardDisplayEntry[]) {
    cachedTop5Entries = entries;
    params.onUpdate(entries);
  }

  async function loadFromApi() {
    try {
      const token = await params.getToken();
      const entries = await fetchLeaderboardTop5(token);

      if (!cancelled) {
        deliverUpdate(entries);
      }
    } catch (error) {
      if (!cancelled) {
        params.onError?.(
          error instanceof Error ? error : new Error("Could not load leaderboard."),
        );
      }
    }
  }

  function startApiFallback() {
    stopPolling();
    unsubscribeSnapshot?.();
    unsubscribeSnapshot = null;

    void loadFromApi();
    pollId = setInterval(() => {
      void loadFromApi();
    }, LEADERBOARD_POLL_MS);
  }

  unsubscribeSnapshot = subscribeLeaderboardTop5(
    (entries) => {
      deliverUpdate(entries);
    },
    (error) => {
      if (isLeaderboardPermissionError(error)) {
        startApiFallback();
        return;
      }

      params.onError?.(error);
    },
  );

  return () => {
    cancelled = true;
    stopPolling();
    unsubscribeSnapshot?.();
  };
}

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  canReadEventFrozenDoc,
  EVENT_STATUS_POLL_MS,
  fetchEventStatus,
  isEventStatusPermissionError,
  subscribeEventFrozen,
} from "@/lib/eventSettingsClient";

type EventContextValue = {
  frozen: boolean;
  loading: boolean;
};

const EventContext = createContext<EventContextValue | null>(null);

export function EventProvider({ children }: { children: ReactNode }) {
  const [frozen, setFrozen] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    let pollId: number | null = null;
    let unsubscribeSnapshot: ReturnType<typeof subscribeEventFrozen> | null =
      null;
    let hasLoadedFromApi = false;

    function stopPolling() {
      if (pollId === null) {
        return;
      }

      window.clearInterval(pollId);
      pollId = null;
    }

    async function loadFromApi() {
      try {
        const status = await fetchEventStatus();

        if (!cancelled) {
          hasLoadedFromApi = true;
          setFrozen(status.frozen);
        }
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setFrozen((current) => current ?? false);
        }
      }
    }

    function startApiPolling() {
      if (pollId !== null) {
        return;
      }

      void loadFromApi();
      pollId = window.setInterval(() => {
        void loadFromApi();
      }, EVENT_STATUS_POLL_MS);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void loadFromApi();
      }
    }

    async function bootstrap() {
      await loadFromApi();

      if (cancelled) {
        return;
      }

      let canUseFirestore = false;

      try {
        canUseFirestore = await canReadEventFrozenDoc();
      } catch (error) {
        console.error(error);
      }

      if (cancelled) {
        return;
      }

      if (!canUseFirestore) {
        startApiPolling();
        return;
      }

      unsubscribeSnapshot = subscribeEventFrozen(
        (nextFrozen) => {
          if (!cancelled && hasLoadedFromApi) {
            setFrozen(nextFrozen);
          }
        },
        (error) => {
          if (cancelled || !isEventStatusPermissionError(error)) {
            return;
          }

          unsubscribeSnapshot?.();
          unsubscribeSnapshot = null;
          startApiPolling();
        },
      );
    }

    void bootstrap();

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      stopPolling();
      unsubscribeSnapshot?.();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const value = useMemo(
    () => ({
      frozen: frozen ?? false,
      loading: frozen === null,
    }),
    [frozen],
  );

  return (
    <EventContext.Provider value={value}>{children}</EventContext.Provider>
  );
}

export function useEventFrozen() {
  const context = useContext(EventContext);

  if (!context) {
    throw new Error("useEventFrozen must be used within an EventProvider");
  }

  return context;
}

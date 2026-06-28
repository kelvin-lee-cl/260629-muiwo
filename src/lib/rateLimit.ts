import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebaseAdmin";

const MAX_ATTEMPTS_PER_MINUTE = 5;
const WINDOW_MS = 60_000;

export class RateLimitExceededError extends Error {
  constructor() {
    super("Too many attempts");
    this.name = "RateLimitExceededError";
  }
}

export async function consumeRateLimitAttempt(studentId: string): Promise<void> {
  const ref = getAdminDb().collection("rateLimits").doc(studentId);
  const now = Date.now();

  await getAdminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);

    if (!snapshot.exists) {
      transaction.set(ref, {
        count: 1,
        resetAt: Timestamp.fromMillis(now + WINDOW_MS),
      });
      return;
    }

    const data = snapshot.data();
    const resetAt = data?.resetAt;

    if (!(resetAt instanceof Timestamp) || now >= resetAt.toMillis()) {
      transaction.set(ref, {
        count: 1,
        resetAt: Timestamp.fromMillis(now + WINDOW_MS),
      });
      return;
    }

    const count = typeof data?.count === "number" ? data.count : 0;

    if (count >= MAX_ATTEMPTS_PER_MINUTE) {
      throw new RateLimitExceededError();
    }

    transaction.update(ref, {
      count: count + 1,
    });
  });
}

/**
 * Seed Firestore venues used by load_test.py.
 *
 * Usage:
 *   node scripts/load-test/setup-venues.mjs
 *
 * Requires .env.local with FIREBASE_SERVICE_ACCOUNT_KEY.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env.local");
  const contents = readFileSync(envPath, "utf8");

  for (const line of contents.split("\n")) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex);
    const value = trimmed.slice(separatorIndex + 1);

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const VENUES = [
  {
    id: "C01",
    title: "Load Test Checkpoint",
    code: "739",
    points: 10,
    type: "checkpoint",
    description: "Checkpoint for load testing.",
    checkpointMode: "code_only",
  },
  {
    id: "B01",
    title: "Load Test Booth",
    code: "739",
    points: 10,
    type: "booth",
    description: "Booth for load testing.",
  },
  {
    id: "W01",
    title: "Load Test Workshop",
    code: "001",
    points: 0,
    type: "workshop",
    description: "Workshop for text-to-image load testing.",
    feature: "text-to-image",
    aiEnabled: true,
  },
];

loadEnvFile();

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountKey) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set in .env.local.");
}

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert(JSON.parse(serviceAccountKey)),
      });

const db = getFirestore(app);

for (const venue of VENUES) {
  await db.collection("booths").doc(venue.id).set(venue, { merge: true });
  console.log(`Upserted ${venue.type} ${venue.id} (code ${venue.code})`);
}

console.log("Done.");

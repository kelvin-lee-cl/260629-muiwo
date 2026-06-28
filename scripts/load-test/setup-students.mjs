/**
 * Create load-test student accounts and export Firebase ID tokens.
 *
 * Usage:
 *   node scripts/load-test/setup-students.mjs
 *   node scripts/load-test/setup-students.mjs --count 450 --output scripts/load-test/students.json
 *
 * Requires .env.local with FIREBASE_SERVICE_ACCOUNT_KEY and NEXT_PUBLIC_FIREBASE_API_KEY.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const DEFAULT_COUNT = 450;
const DEFAULT_OUTPUT = "scripts/load-test/students.json";

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

function parseArgs() {
  const args = process.argv.slice(2);
  let count = DEFAULT_COUNT;
  let output = DEFAULT_OUTPUT;

  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--count" && args[index + 1]) {
      count = Number.parseInt(args[index + 1], 10);
      index += 1;
    } else if (args[index] === "--output" && args[index + 1]) {
      output = args[index + 1];
      index += 1;
    }
  }

  if (!Number.isFinite(count) || count < 1) {
    throw new Error("--count must be a positive integer.");
  }

  return { count, output: resolve(process.cwd(), output) };
}

function generateStudentIds(count) {
  const ids = [];

  for (let grade = 4; grade <= 6 && ids.length < count; grade += 1) {
    for (let letterCode = 65; letterCode <= 90 && ids.length < count; letterCode += 1) {
      const letter = String.fromCharCode(letterCode);

      for (let number = 1; number <= 99 && ids.length < count; number += 1) {
        ids.push(`${grade}${letter}${String(number).padStart(2, "0")}`);
      }
    }
  }

  return ids.slice(0, count);
}

async function exchangeCustomToken(apiKey, customToken) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: customToken,
        returnSecureToken: true,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${errorText}`);
  }

  const payload = await response.json();
  return payload.idToken;
}

loadEnvFile();

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

if (!serviceAccountKey) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set in .env.local.");
}

if (!firebaseApiKey) {
  throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY is not set in .env.local.");
}

const { count, output } = parseArgs();
const studentIds = generateStudentIds(count);

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert(JSON.parse(serviceAccountKey)),
      });

const auth = getAuth(app);
const db = getFirestore(app);
const students = [];

console.log(`Creating ${count} load-test students...`);

for (const studentId of studentIds) {
  const uid = `loadtest-${studentId}`;
  const parsedClass = studentId.slice(0, 2);
  const parsedNumber = studentId.slice(2, 4);

  try {
    await auth.getUser(uid);
  } catch {
    await auth.createUser({ uid });
  }

  await db.collection("students").doc(uid).set(
    {
      uid: studentId,
      name: "",
      class: parsedClass,
      number: parsedNumber,
      totalPoints: 0,
      visitedBooths: [],
      lastLogin: FieldValue.serverTimestamp(),
      lastSeen: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const customToken = await auth.createCustomToken(uid);
  const idToken = await exchangeCustomToken(firebaseApiKey, customToken);

  students.push({
    studentId,
    authUid: uid,
    token: idToken,
  });

  if (students.length % 50 === 0) {
    console.log(`  ${students.length}/${count} ready`);
  }
}

writeFileSync(
  output,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      count: students.length,
      students,
    },
    null,
    2,
  ),
);

console.log(`Wrote ${students.length} students to ${output}`);

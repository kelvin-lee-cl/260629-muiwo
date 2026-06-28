import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

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

async function deleteCollection(db, collectionName) {
  const snapshot = await db.collection(collectionName).get();

  if (snapshot.empty) {
    return 0;
  }

  let deleted = 0;
  const docs = snapshot.docs;

  for (let index = 0; index < docs.length; index += 500) {
    const batch = db.batch();
    const chunk = docs.slice(index, index + 500);

    for (const doc of chunk) {
      batch.delete(doc.ref);
      deleted += 1;
    }

    await batch.commit();
  }

  return deleted;
}

loadEnvFile();

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountKey) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set.");
}

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert(JSON.parse(serviceAccountKey)),
      });

const db = getFirestore(app);

const [studentsDeleted, visitsDeleted, rateLimitsDeleted, studentWorksDeleted] =
  await Promise.all([
  deleteCollection(db, "students"),
  deleteCollection(db, "visits"),
  deleteCollection(db, "rateLimits"),
  deleteCollection(db, "studentWorks"),
]);

await db.doc("settings/event").set(
  {
    frozen: false,
    updatedAt: FieldValue.serverTimestamp(),
  },
  { merge: true },
);

await db.doc("leaderboard/top5").set(
  {
    top: [],
    updatedAt: FieldValue.serverTimestamp(),
  },
  { merge: true },
);

console.log(
  JSON.stringify({
    success: true,
    studentsDeleted,
    visitsDeleted,
    rateLimitsDeleted,
    studentWorksDeleted,
  }),
);

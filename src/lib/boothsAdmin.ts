import { getAdminDb } from "@/lib/firebaseAdmin";
import type { BoothDocument, BoothInput } from "@/lib/booths";
import { normalizeBoothCode, toBoothDocument } from "@/lib/booths";

export async function listBooths(): Promise<BoothDocument[]> {
  const snapshot = await getAdminDb().collection("booths").get();

  return snapshot.docs
    .map((doc) => doc.data() as BoothDocument)
    .sort((left, right) => left.id.localeCompare(right.id));
}

export async function getBooth(boothId: string): Promise<BoothDocument | null> {
  const snapshot = await getAdminDb().collection("booths").doc(boothId).get();

  if (!snapshot.exists) {
    return null;
  }

  return snapshot.data() as BoothDocument;
}

export async function isBoothCodeTaken(
  code: string,
  excludeBoothId?: string,
): Promise<boolean> {
  const normalizedCode = normalizeBoothCode(code);
  const snapshot = await getAdminDb()
    .collection("booths")
    .where("code", "==", normalizedCode)
    .get();

  return snapshot.docs.some((doc) => {
    if (doc.id === excludeBoothId) {
      return false;
    }

    const data = doc.data() as BoothDocument;
    return data.type === "booth" || data.type === "checkpoint";
  });
}

export async function createBooth(input: BoothInput): Promise<BoothDocument> {
  const booth = toBoothDocument(input);
  const boothRef = getAdminDb().collection("booths").doc(booth.id);
  const existing = await boothRef.get();

  if (existing.exists) {
    throw new Error("A booth with this ID already exists.");
  }

  if (
    booth.type !== "workshop" &&
    (await isBoothCodeTaken(booth.code))
  ) {
    throw new Error("Another booth is already using this code.");
  }

  await boothRef.set(booth);
  return booth;
}

export async function updateBooth(
  boothId: string,
  input: BoothInput,
): Promise<BoothDocument> {
  const booth = toBoothDocument({ ...input, id: boothId });
  const boothRef = getAdminDb().collection("booths").doc(boothId);
  const existing = await boothRef.get();

  if (!existing.exists) {
    throw new Error("Booth not found.");
  }

  if (
    booth.type !== "workshop" &&
    (await isBoothCodeTaken(booth.code, boothId))
  ) {
    throw new Error("Another booth is already using this code.");
  }

  await boothRef.set(booth);
  return booth;
}

export async function deleteBooth(boothId: string): Promise<void> {
  const boothRef = getAdminDb().collection("booths").doc(boothId);
  const existing = await boothRef.get();

  if (!existing.exists) {
    throw new Error("Booth not found.");
  }

  await boothRef.delete();
}

export async function deleteAllBooths(): Promise<number> {
  const snapshot = await getAdminDb().collection("booths").get();

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

import { collection, doc, getDoc, getDocs } from "firebase/firestore";

import type { BoothDocument } from "@/lib/booths";
import { normalizeBoothId } from "@/lib/booths";
import { getClientDb } from "@/lib/firebaseClient";

export async function fetchBoothFromFirestore(
  boothId: string,
): Promise<BoothDocument | null> {
  const normalizedId = normalizeBoothId(boothId);
  const snapshot = await getDoc(doc(getClientDb(), "booths", normalizedId));

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as BoothDocument;
}

export async function fetchAllBoothsFromFirestore(): Promise<BoothDocument[]> {
  const snapshot = await getDocs(collection(getClientDb(), "booths"));

  return snapshot.docs
    .map((docSnap) => docSnap.data() as BoothDocument)
    .sort((left, right) => left.id.localeCompare(right.id));
}

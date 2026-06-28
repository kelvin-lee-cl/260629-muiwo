import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { getClientDb } from "@/lib/firebaseClient";
import { parseStudentId } from "@/lib/studentId";

export type StudentDocument = {
  uid: string;
  name: string;
  class: string;
  number: string;
  totalPoints: number;
  visitedBooths: string[];
  lastLogin: ReturnType<typeof serverTimestamp>;
  lastSeen: ReturnType<typeof serverTimestamp>;
};

export async function upsertStudentProfile(
  authUid: string,
  studentId: string,
): Promise<void> {
  const parsed = parseStudentId(studentId);

  if (!parsed) {
    throw new Error("Invalid student ID.");
  }

  const studentRef = doc(getClientDb(), "students", authUid);
  const existing = await getDoc(studentRef);

  const profile: Partial<StudentDocument> = {
    uid: studentId,
    name: "",
    class: parsed.class,
    number: parsed.number,
    lastLogin: serverTimestamp(),
    lastSeen: serverTimestamp(),
  };

  if (!existing.exists()) {
    await setDoc(studentRef, {
      ...profile,
      totalPoints: 0,
      visitedBooths: [],
    });
    return;
  }

  await setDoc(studentRef, profile, { merge: true });
}

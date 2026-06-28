import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebaseAdmin";
import { getCheckpointQuizAttemptState } from "@/lib/checkpoint";
import { normalizeBoothCode, normalizeBoothId } from "@/lib/booths";
import { normalizeStudentId } from "@/lib/studentId";

export type VisitDocument = {
  studentId: string;
  boothId: string;
  authUid: string;
  timestamp: ReturnType<typeof FieldValue.serverTimestamp>;
  pointsAwarded: number;
};

export function visitDocumentId(studentId: string, boothId: string): string {
  return `${normalizeStudentId(studentId)}_${normalizeBoothId(boothId)}`;
}

export class ClaimError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ClaimError";
    this.status = status;
  }
}

async function hasCheckpointImageSubmission(params: {
  authUid: string;
  studentId: string;
  boothId: string;
  submissionWorkId?: string;
}): Promise<boolean> {
  const boothId = normalizeBoothId(params.boothId);
  const studentId = normalizeStudentId(params.studentId);

  if (params.submissionWorkId) {
    const workSnap = await getAdminDb()
      .collection("studentWorks")
      .doc(params.submissionWorkId)
      .get();

    if (!workSnap.exists) {
      return false;
    }

    const data = workSnap.data();

    return (
      data?.authUid === params.authUid &&
      normalizeStudentId(typeof data.studentId === "string" ? data.studentId : "") ===
        studentId &&
      normalizeBoothId(typeof data.venueId === "string" ? data.venueId : "") ===
        boothId &&
      data?.venueType === "checkpoint" &&
      data?.feature === "submission" &&
      typeof data.imageUrl === "string" &&
      Boolean(data.imageUrl)
    );
  }

  const snapshot = await getAdminDb()
    .collection("studentWorks")
    .where("authUid", "==", params.authUid)
    .get();

  return snapshot.docs.some((docSnap) => {
    const data = docSnap.data();

    return (
      normalizeBoothId(typeof data.venueId === "string" ? data.venueId : "") ===
        boothId &&
      data.venueType === "checkpoint" &&
      data.feature === "submission" &&
      typeof data.imageUrl === "string" &&
      Boolean(data.imageUrl)
    );
  });
}

export async function claimBoothVisit(params: {
  authUid: string;
  studentId: string;
  boothId: string;
  enteredCode: string;
  submissionWorkId?: string;
}): Promise<{ pointsAwarded: number }> {
  const studentId = normalizeStudentId(params.studentId);
  const boothId = normalizeBoothId(params.boothId);
  const enteredCode = normalizeBoothCode(params.enteredCode);

  if (!/^\d{3}$/.test(enteredCode)) {
    throw new ClaimError("請輸入 3 位數密碼。", 400);
  }

  const studentRef = getAdminDb().collection("students").doc(params.authUid);
  const boothRef = getAdminDb().collection("booths").doc(boothId);
  const visitRef = getAdminDb()
    .collection("visits")
    .doc(visitDocumentId(studentId, boothId));

  const boothSnap = await boothRef.get();

  if (!boothSnap.exists) {
    throw new ClaimError("找不到攤位。", 404);
  }

  const boothData = boothSnap.data();

  if (
    boothData?.type === "checkpoint" &&
    boothData.checkpointMode === "code_and_image"
  ) {
    const hasImage = await hasCheckpointImageSubmission({
      authUid: params.authUid,
      studentId,
      boothId,
      submissionWorkId: params.submissionWorkId,
    });

    if (!hasImage) {
      throw new ClaimError("請先上載圖片。", 400);
    }
  }

  if (
    boothData?.type === "checkpoint" &&
    boothData.checkpointMode === "code_and_quiz"
  ) {
    const quizAttemptState = await getCheckpointQuizAttemptState({
      studentId,
      boothId,
    });

    if (!quizAttemptState.passed) {
      throw new ClaimError(
        quizAttemptState.exhausted
          ? "你已用完所有答題機會。"
          : "請先答對測驗題目。",
        400,
      );
    }
  }

  return getAdminDb().runTransaction(async (transaction) => {
    const [studentSnap, boothSnap, visitSnap] = await Promise.all([
      transaction.get(studentRef),
      transaction.get(boothRef),
      transaction.get(visitRef),
    ]);

    if (!studentSnap.exists) {
      throw new ClaimError("找不到學生資料。", 404);
    }

    const studentData = studentSnap.data();
    const profileStudentId =
      typeof studentData?.uid === "string"
        ? normalizeStudentId(studentData.uid)
        : "";

    if (profileStudentId !== studentId) {
      throw new ClaimError("未獲授權。", 403);
    }

    if (!boothSnap.exists) {
      throw new ClaimError("找不到攤位。", 404);
    }

    if (visitSnap.exists) {
      throw new ClaimError("你已領取過此攤位的分數", 400);
    }

    const boothData = boothSnap.data();
    const boothCode =
      typeof boothData?.code === "string"
        ? normalizeBoothCode(boothData.code)
        : "";
    const pointsAwarded =
      typeof boothData?.points === "number" ? boothData.points : 0;

    if (enteredCode !== boothCode) {
      throw new ClaimError("密碼錯誤", 400);
    }

    transaction.set(visitRef, {
      studentId,
      boothId,
      authUid: params.authUid,
      timestamp: FieldValue.serverTimestamp(),
      pointsAwarded,
    } satisfies VisitDocument);

    transaction.update(studentRef, {
      totalPoints: FieldValue.increment(pointsAwarded),
      visitedBooths: FieldValue.arrayUnion(boothId),
    });

    return { pointsAwarded };
  });
}
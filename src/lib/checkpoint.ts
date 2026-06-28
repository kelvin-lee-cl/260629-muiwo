import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebaseAdmin";
import {
  normalizeBoothCode,
  normalizeBoothId,
  normalizePosterImageUrl,
  type BoothDocument,
  type CheckpointQuiz,
} from "@/lib/booths";
import { visitDocumentId } from "@/lib/claim";
import { normalizeStudentId } from "@/lib/studentId";

export const MAX_CHECKPOINT_QUIZ_ATTEMPTS = 2;

type CheckpointQuizAttemptDocument = {
  studentId: string;
  boothId: string;
  authUid: string;
  wrongAttempts: number;
  passed: boolean;
  updatedAt: ReturnType<typeof FieldValue.serverTimestamp>;
};

export type CheckpointQuizAttemptState = {
  wrongAttempts: number;
  passed: boolean;
  exhausted: boolean;
};

function checkpointQuizAttemptDocumentId(
  studentId: string,
  boothId: string,
): string {
  return `${normalizeStudentId(studentId)}_${normalizeBoothId(boothId)}`;
}

function toQuizAttemptState(data: Record<string, unknown> | undefined): CheckpointQuizAttemptState {
  const wrongAttempts =
    typeof data?.wrongAttempts === "number" ? data.wrongAttempts : 0;
  const passed = data?.passed === true;

  return {
    wrongAttempts,
    passed,
    exhausted: !passed && wrongAttempts >= MAX_CHECKPOINT_QUIZ_ATTEMPTS,
  };
}

export async function getCheckpointQuizAttemptState(params: {
  studentId: string;
  boothId: string;
}): Promise<CheckpointQuizAttemptState> {
  const snap = await getAdminDb()
    .collection("checkpointQuizAttempts")
    .doc(checkpointQuizAttemptDocumentId(params.studentId, params.boothId))
    .get();

  return toQuizAttemptState(snap.data());
}

async function recordCheckpointQuizWrongAttempt(params: {
  authUid: string;
  studentId: string;
  boothId: string;
}): Promise<{ wrongAttempts: number; exhausted: boolean }> {
  const ref = getAdminDb()
    .collection("checkpointQuizAttempts")
    .doc(checkpointQuizAttemptDocumentId(params.studentId, params.boothId));

  return getAdminDb().runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const state = toQuizAttemptState(snap.data());

    if (state.passed) {
      throw new CheckpointError("你已答對此測驗。", 400);
    }

    if (state.exhausted) {
      throw new CheckpointError("你已用完所有答題機會。", 403);
    }

    const wrongAttempts = state.wrongAttempts + 1;
    const exhausted = wrongAttempts >= MAX_CHECKPOINT_QUIZ_ATTEMPTS;

    transaction.set(
      ref,
      {
        studentId: normalizeStudentId(params.studentId),
        boothId: normalizeBoothId(params.boothId),
        authUid: params.authUid,
        wrongAttempts,
        passed: false,
        updatedAt: FieldValue.serverTimestamp(),
      } satisfies CheckpointQuizAttemptDocument,
      { merge: true },
    );

    return { wrongAttempts, exhausted };
  });
}

async function recordCheckpointQuizPass(params: {
  authUid: string;
  studentId: string;
  boothId: string;
}): Promise<void> {
  const ref = getAdminDb()
    .collection("checkpointQuizAttempts")
    .doc(checkpointQuizAttemptDocumentId(params.studentId, params.boothId));

  await ref.set(
    {
      studentId: normalizeStudentId(params.studentId),
      boothId: normalizeBoothId(params.boothId),
      authUid: params.authUid,
      passed: true,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export type CheckpointQuizPublic = {
  question: string;
  options: string[];
};

export type CheckpointPreview = {
  boothId: string;
  title: string;
  points: number;
  posterImageUrl?: string;
  hasQuiz: boolean;
  quiz?: CheckpointQuizPublic;
  hasImageUpload: boolean;
  submissionInstruction?: string;
  alreadyClaimed: boolean;
  quizAttemptsUsed?: number;
  quizExhausted?: boolean;
};

export class CheckpointError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "CheckpointError";
    this.status = status;
  }
}

function toPublicQuiz(quiz: CheckpointQuiz): CheckpointQuizPublic {
  return {
    question: quiz.question,
    options: quiz.options,
  };
}

export async function findCheckpointByCode(
  enteredCode: string,
): Promise<BoothDocument | null> {
  const code = normalizeBoothCode(enteredCode);

  if (!/^\d{3}$/.test(code)) {
    return null;
  }

  const snapshot = await getAdminDb()
    .collection("booths")
    .where("code", "==", code)
    .get();

  const checkpoint = snapshot.docs
    .map((docSnap) => docSnap.data() as BoothDocument)
    .find((booth) => booth.type === "checkpoint");

  return checkpoint ?? null;
}

export async function hasStudentClaimedCheckpoint(params: {
  authUid: string;
  studentId: string;
  boothId: string;
}): Promise<boolean> {
  const studentId = normalizeStudentId(params.studentId);
  const visitRef = getAdminDb()
    .collection("visits")
    .doc(visitDocumentId(studentId, params.boothId));
  const visitSnap = await visitRef.get();

  if (visitSnap.exists) {
    return true;
  }

  const studentSnap = await getAdminDb().collection("students").doc(params.authUid).get();
  const visitedBooths = studentSnap.data()?.visitedBooths;

  return Array.isArray(visitedBooths) && visitedBooths.includes(params.boothId);
}

export async function previewCheckpointByCode(params: {
  authUid: string;
  studentId: string;
  enteredCode: string;
}): Promise<CheckpointPreview> {
  const checkpoint = await findCheckpointByCode(params.enteredCode);

  if (!checkpoint) {
    throw new CheckpointError("此密碼不符合任何關卡。", 404);
  }

  const alreadyClaimed = await hasStudentClaimedCheckpoint({
    authUid: params.authUid,
    studentId: params.studentId,
    boothId: checkpoint.id,
  });

  const hasQuiz =
    checkpoint.checkpointMode === "code_and_quiz" &&
    Boolean(checkpoint.checkpointQuiz?.question.trim());

  const hasImageUpload = checkpoint.checkpointMode === "code_and_image";
  const submissionInstruction = hasImageUpload
    ? checkpoint.submissionInstruction?.trim() || undefined
    : undefined;

  const posterImageUrl = normalizePosterImageUrl(checkpoint.posterImageUrl);
  const quizAttemptState = hasQuiz
    ? await getCheckpointQuizAttemptState({
        studentId: params.studentId,
        boothId: checkpoint.id,
      })
    : null;

  return {
    boothId: checkpoint.id,
    title: checkpoint.title,
    points: checkpoint.points,
    posterImageUrl,
    hasQuiz,
    quiz:
      hasQuiz && checkpoint.checkpointQuiz && !quizAttemptState?.exhausted
        ? toPublicQuiz(checkpoint.checkpointQuiz)
        : undefined,
    hasImageUpload,
    submissionInstruction,
    alreadyClaimed,
    quizAttemptsUsed: quizAttemptState?.wrongAttempts,
    quizExhausted: quizAttemptState?.exhausted,
  };
}

export async function checkCheckpointQuizAnswer(params: {
  authUid: string;
  studentId: string;
  enteredCode: string;
  selectedOptionIndex: number;
}): Promise<{
  correct: boolean;
  message: string;
  wrongAttempts?: number;
  exhausted?: boolean;
}> {
  const checkpoint = await findCheckpointByCode(params.enteredCode);

  if (!checkpoint) {
    throw new CheckpointError("找不到關卡。", 404);
  }

  if (
    checkpoint.checkpointMode !== "code_and_quiz" ||
    !checkpoint.checkpointQuiz
  ) {
    throw new CheckpointError("此關卡沒有測驗。", 400);
  }

  const attemptState = await getCheckpointQuizAttemptState({
    studentId: params.studentId,
    boothId: checkpoint.id,
  });

  if (attemptState.exhausted) {
    throw new CheckpointError("你已用完所有答題機會。", 403);
  }

  const quiz = checkpoint.checkpointQuiz;
  const correct = params.selectedOptionIndex === quiz.correctOptionIndex;

  if (correct) {
    await recordCheckpointQuizPass({
      authUid: params.authUid,
      studentId: params.studentId,
      boothId: checkpoint.id,
    });

    return {
      correct: true,
      message: quiz.correctResponse || "答對了！",
    };
  }

  const { wrongAttempts, exhausted } = await recordCheckpointQuizWrongAttempt({
    authUid: params.authUid,
    studentId: params.studentId,
    boothId: checkpoint.id,
  });

  return {
    correct: false,
    message: exhausted
      ? quiz.incorrectResponse || "抱歉，答案不正確。"
      : quiz.incorrectResponse || "不太對喔！",
    wrongAttempts,
    exhausted,
  };
}

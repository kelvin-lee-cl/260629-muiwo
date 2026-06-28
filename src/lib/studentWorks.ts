import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebaseAdmin";
import {
  isBoothFeature,
  isBoothType,
  normalizeBoothId,
  type BoothFeature,
} from "@/lib/booths";
import { normalizeStudentId } from "@/lib/studentId";
import {
  MAX_STUDENT_WORK_IMAGE_BYTES,
  type StudentWorkDocument,
  type StudentWorkInput,
} from "@/lib/studentWorksShared";

export class StudentWorkError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "StudentWorkError";
    this.status = status;
  }
}

function timestampToMs(value: unknown): number | null {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }

  return null;
}

function toStudentWorkDocument(
  id: string,
  data: FirebaseFirestore.DocumentData,
): StudentWorkDocument {
  return {
    id,
    studentId:
      typeof data.studentId === "string"
        ? normalizeStudentId(data.studentId)
        : "",
    authUid: typeof data.authUid === "string" ? data.authUid : "",
    venueId:
      typeof data.venueId === "string" ? normalizeBoothId(data.venueId) : "",
    venueType:
      data.venueType === "workshop"
        ? "workshop"
        : data.venueType === "checkpoint"
          ? "checkpoint"
          : "booth",
    feature: isBoothFeature(data.feature) ? data.feature : "submission",
    prompt: typeof data.prompt === "string" ? data.prompt : undefined,
    generatedText:
      typeof data.generatedText === "string" ? data.generatedText : undefined,
    imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : undefined,
    videoUrl: typeof data.videoUrl === "string" ? data.videoUrl : undefined,
    submissionText:
      typeof data.submissionText === "string" ? data.submissionText : undefined,
    submissionUrl:
      typeof data.submissionUrl === "string" ? data.submissionUrl : undefined,
    createdAtMs: timestampToMs(data.createdAt),
  };
}

function validateStoredImageUrl(imageUrl: string | undefined): string | undefined {
  const normalized = imageUrl?.trim() || undefined;

  if (!normalized) {
    return undefined;
  }

  if (Buffer.byteLength(normalized, "utf8") > MAX_STUDENT_WORK_IMAGE_BYTES) {
    throw new StudentWorkError("圖片太大，請選擇較小的照片。", 413);
  }

  return normalized;
}

function parseStudentWorkInput(body: StudentWorkInput): StudentWorkInput {
  const venueId = normalizeBoothId(body.venueId);

  if (!venueId) {
    throw new StudentWorkError("Venue ID is required.", 400);
  }

  if (
    body.venueType !== "booth" &&
    body.venueType !== "workshop" &&
    body.venueType !== "checkpoint"
  ) {
    throw new StudentWorkError("Invalid venue type.", 400);
  }

  if (!isBoothFeature(body.feature)) {
    throw new StudentWorkError("Invalid feature.", 400);
  }

  return {
    venueId,
    venueType: body.venueType,
    feature: body.feature,
    prompt: body.prompt?.trim() || undefined,
    generatedText: body.generatedText?.trim() || undefined,
    imageUrl: validateStoredImageUrl(body.imageUrl),
    videoUrl: body.videoUrl?.trim() || undefined,
    submissionText: body.submissionText?.trim() || undefined,
    submissionUrl: body.submissionUrl?.trim() || undefined,
  };
}

export async function createStudentWork(params: {
  authUid: string;
  studentId: string;
  input: StudentWorkInput;
}): Promise<StudentWorkDocument> {
  const studentId = normalizeStudentId(params.studentId);
  const input = parseStudentWorkInput(params.input);

  const studentRef = getAdminDb().collection("students").doc(params.authUid);
  const venueRef = getAdminDb().collection("booths").doc(input.venueId);
  const workRef = getAdminDb().collection("studentWorks").doc();

  const document = await getAdminDb().runTransaction(async (transaction) => {
    const [studentSnap, venueSnap] = await Promise.all([
      transaction.get(studentRef),
      transaction.get(venueRef),
    ]);

    if (!studentSnap.exists) {
      throw new StudentWorkError("Student profile not found.", 404);
    }

    const profileStudentId =
      typeof studentSnap.data()?.uid === "string"
        ? normalizeStudentId(studentSnap.data()!.uid)
        : "";

    if (profileStudentId !== studentId) {
      throw new StudentWorkError("Unauthorized.", 403);
    }

    if (!venueSnap.exists) {
      throw new StudentWorkError("Venue not found.", 404);
    }

    const venueData = venueSnap.data();
    const venueType = venueData?.type;

    if (!isBoothType(venueType)) {
      throw new StudentWorkError("Venue type mismatch.", 400);
    }

    if (input.venueType === "booth" && venueType !== "booth") {
      throw new StudentWorkError("Venue type mismatch.", 400);
    }

    if (input.venueType === "workshop" && venueType !== "workshop") {
      throw new StudentWorkError("Venue type mismatch.", 400);
    }

    if (input.venueType === "checkpoint") {
      if (venueType !== "checkpoint") {
        throw new StudentWorkError("Venue type mismatch.", 400);
      }

      if (venueData?.checkpointMode !== "code_and_image") {
        throw new StudentWorkError(
          "This checkpoint does not accept image submissions.",
          400,
        );
      }

      if (input.feature !== "submission") {
        throw new StudentWorkError("Invalid feature for checkpoint.", 400);
      }

      if (!input.imageUrl) {
        throw new StudentWorkError("Image is required.", 400);
      }
    } else {
      const venueFeature = venueData?.feature;

      if (
        typeof venueFeature !== "string" ||
        !isBoothFeature(venueFeature) ||
        venueFeature !== input.feature
      ) {
        throw new StudentWorkError("Feature does not match this venue.", 400);
      }
    }

    const payload = {
      studentId,
      authUid: params.authUid,
      venueId: input.venueId,
      venueType: input.venueType,
      feature: input.feature,
      createdAt: FieldValue.serverTimestamp(),
      ...(input.prompt ? { prompt: input.prompt } : {}),
      ...(input.generatedText ? { generatedText: input.generatedText } : {}),
      ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
      ...(input.videoUrl ? { videoUrl: input.videoUrl } : {}),
      ...(input.submissionText ? { submissionText: input.submissionText } : {}),
      ...(input.submissionUrl ? { submissionUrl: input.submissionUrl } : {}),
    };

    transaction.set(workRef, payload);

    return payload;
  });

  return toStudentWorkDocument(workRef.id, {
    ...document,
    createdAt: Timestamp.now(),
  });
}

export async function listStudentWorksForStudent(
  authUid: string,
  studentId: string,
): Promise<StudentWorkDocument[]> {
  const normalizedStudentId = normalizeStudentId(studentId);
  const snapshot = await getAdminDb()
    .collection("studentWorks")
    .where("authUid", "==", authUid)
    .where("studentId", "==", normalizedStudentId)
    .get();

  return snapshot.docs
    .map((docSnap) => toStudentWorkDocument(docSnap.id, docSnap.data()))
    .sort((left, right) => (right.createdAtMs ?? 0) - (left.createdAtMs ?? 0));
}

export async function listStudentWorksForAdmin(
  feature?: BoothFeature,
): Promise<StudentWorkDocument[]> {
  const snapshot = feature
    ? await getAdminDb()
        .collection("studentWorks")
        .where("feature", "==", feature)
        .get()
    : await getAdminDb().collection("studentWorks").get();

  return snapshot.docs
    .map((docSnap) => toStudentWorkDocument(docSnap.id, docSnap.data()))
    .sort((left, right) => (right.createdAtMs ?? 0) - (left.createdAtMs ?? 0));
}

export async function deleteAllStudentWorks(): Promise<number> {
  const snapshot = await getAdminDb().collection("studentWorks").get();

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

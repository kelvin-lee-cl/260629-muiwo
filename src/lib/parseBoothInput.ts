import {
  type BoothInput,
  isBoothFeature,
  isBoothType,
  isCheckpointMode,
  isSubmissionType,
  parseCheckpointQuiz,
  parsePresetPrompts,
} from "@/lib/booths";

export function parseBoothInputBody(
  body: unknown,
  options?: { requireId?: boolean },
): BoothInput | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const value = body as Record<string, unknown>;
  const requireId = options?.requireId ?? true;

  if (
    (requireId && typeof value.id !== "string") ||
    typeof value.title !== "string" ||
    typeof value.code !== "string" ||
    typeof value.description !== "string" ||
    typeof value.type !== "string" ||
    !isBoothType(value.type)
  ) {
    return null;
  }

  const points =
    typeof value.points === "number" ? value.points : Number(value.points);

  const input: BoothInput = {
    id: typeof value.id === "string" ? value.id : "",
    title: value.title,
    code: value.code,
    points,
    type: value.type,
    helperName:
      typeof value.helperName === "string" ? value.helperName : undefined,
    posterImageUrl:
      typeof value.posterImageUrl === "string"
        ? value.posterImageUrl
        : undefined,
    description: value.description,
  };

  if (
    typeof value.feature === "string" &&
    isBoothFeature(value.feature)
  ) {
    input.feature = value.feature;
  }

  if (
    typeof value.checkpointMode === "string" &&
    isCheckpointMode(value.checkpointMode)
  ) {
    input.checkpointMode = value.checkpointMode;
  }

  if (Array.isArray(value.workshopSlides)) {
    input.workshopSlides = value.workshopSlides.filter(
      (slide): slide is string => typeof slide === "string",
    );
  }

  if (
    typeof value.submissionType === "string" &&
    isSubmissionType(value.submissionType)
  ) {
    input.submissionType = value.submissionType;
  }

  if (typeof value.submissionInstruction === "string") {
    input.submissionInstruction = value.submissionInstruction;
  }

  if (typeof value.presetPromptsEnabled === "boolean") {
    input.presetPromptsEnabled = value.presetPromptsEnabled;
  }

  const presetPrompts = parsePresetPrompts(value.presetPrompts);
  if (presetPrompts) {
    input.presetPrompts = presetPrompts;
  }

  const checkpointQuiz = parseCheckpointQuiz(value.checkpointQuiz);
  if (checkpointQuiz) {
    input.checkpointQuiz = checkpointQuiz;
  }

  return input;
}

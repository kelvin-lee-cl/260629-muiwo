export const BOOTH_TYPES = ["booth", "checkpoint", "workshop"] as const;

export type BoothType = (typeof BOOTH_TYPES)[number];

export const BOOTH_FEATURES = [
  "text-to-image",
  "text-generator",
  "image-to-video",
  "submission",
] as const;

export type BoothFeature = (typeof BOOTH_FEATURES)[number];

export const SUBMISSION_TYPES = ["text", "image", "hyperlink"] as const;

export type SubmissionType = (typeof SUBMISSION_TYPES)[number];

export const CHECKPOINT_MODES = [
  "code_only",
  "code_and_quiz",
  "code_and_image",
] as const;

export type CheckpointMode = (typeof CHECKPOINT_MODES)[number];

export const CHECKPOINT_QUIZ_OPTION_COUNT = 4;

export type CheckpointQuiz = {
  question: string;
  options: string[];
  correctOptionIndex: number;
  correctResponse: string;
  incorrectResponse: string;
};

export type PresetPrompt = {
  name: string;
  prompt: string;
};

export type BoothDocument = {
  id: string;
  title: string;
  code: string;
  points: number;
  type: BoothType;
  helperName?: string;
  posterImageUrl?: string;
  description: string;
  aiEnabled?: boolean;
  feature?: BoothFeature;
  submissionType?: SubmissionType;
  submissionInstruction?: string;
  checkpointMode?: CheckpointMode;
  checkpointQuiz?: CheckpointQuiz;
  workshopSlides?: string[];
  presetPromptsEnabled?: boolean;
  presetPrompts?: PresetPrompt[];
};

export type BoothInput = {
  id: string;
  title: string;
  code: string;
  points: number;
  type: BoothType;
  helperName?: string;
  posterImageUrl?: string;
  description: string;
  feature?: BoothFeature;
  submissionType?: SubmissionType;
  submissionInstruction?: string;
  checkpointMode?: CheckpointMode;
  checkpointQuiz?: CheckpointQuiz;
  workshopSlides?: string[];
  presetPromptsEnabled?: boolean;
  presetPrompts?: PresetPrompt[];
};

const VENUE_ID_PATTERNS: Record<BoothType, RegExp> = {
  booth: /^B\d{2}$/,
  checkpoint: /^C\d{2}$/,
  workshop: /^W\d{2}$/,
};

const VENUE_ID_HINTS: Record<BoothType, string> = {
  booth: "B01",
  checkpoint: "C01",
  workshop: "W01",
};

export function normalizeBoothId(raw: string): string {
  return raw.trim().toUpperCase();
}

export function normalizeBoothCode(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 3);
}

export function normalizePosterImageUrl(
  url?: string | null,
): string | undefined {
  if (typeof url !== "string") {
    return undefined;
  }

  const trimmed = url.trim();
  return trimmed || undefined;
}

export function workshopCodeFromId(id: string): string {
  const digits = normalizeBoothId(id).replace(/\D/g, "");

  if (!digits) {
    return "000";
  }

  return digits.padStart(3, "0").slice(-3);
}

export function isBoothType(value: string): value is BoothType {
  return BOOTH_TYPES.includes(value as BoothType);
}

export function isBoothFeature(value: string): value is BoothFeature {
  return BOOTH_FEATURES.includes(value as BoothFeature);
}

export function isCheckpointMode(value: string): value is CheckpointMode {
  return CHECKPOINT_MODES.includes(value as CheckpointMode);
}

export function isSubmissionType(value: string): value is SubmissionType {
  return SUBMISSION_TYPES.includes(value as SubmissionType);
}

export function submissionTypeLabel(type: SubmissionType): string {
  switch (type) {
    case "text":
      return "Text";
    case "image":
      return "Image";
    case "hyperlink":
      return "Hyperlink";
  }
}

export function boothFeatureLabel(feature: BoothFeature): string {
  switch (feature) {
    case "text-to-image":
      return "Text-to-image";
    case "text-generator":
      return "Text generator";
    case "image-to-video":
      return "Upload image and create video";
    case "submission":
      return "Submission";
  }
}

export function isAiBoothFeature(feature: BoothFeature | undefined): boolean {
  return (
    feature === "text-to-image" ||
    feature === "text-generator" ||
    feature === "image-to-video"
  );
}

export function isPromptBasedAiFeature(
  feature: BoothFeature | undefined,
): boolean {
  return feature === "text-to-image" || feature === "text-generator";
}

export function emptyPresetPrompt(): PresetPrompt {
  return { name: "", prompt: "" };
}

export function normalizePresetPrompts(
  prompts: PresetPrompt[],
): PresetPrompt[] {
  return prompts
    .map((item) => ({
      name: item.name.trim(),
      prompt: item.prompt.trim(),
    }))
    .filter((item) => item.name || item.prompt);
}

export function parsePresetPrompts(value: unknown): PresetPrompt[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const prompts = value
    .filter(
      (item): item is PresetPrompt =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as PresetPrompt).name === "string" &&
        typeof (item as PresetPrompt).prompt === "string",
    )
    .map((item) => ({
      name: item.name,
      prompt: item.prompt,
    }));

  return prompts.length > 0 ? prompts : undefined;
}

export function deriveAiEnabledFromFeature(
  feature: BoothFeature | undefined,
): boolean {
  return isAiBoothFeature(feature);
}

export function checkpointModeLabel(mode: CheckpointMode): string {
  switch (mode) {
    case "code_only":
      return "Enter digits to get score";
    case "code_and_quiz":
      return "Enter digits + multiple-choice question";
    case "code_and_image":
      return "Enter digits + image upload";
  }
}

export function emptyCheckpointQuiz(): CheckpointQuiz {
  return {
    question: "",
    options: Array.from({ length: CHECKPOINT_QUIZ_OPTION_COUNT }, () => ""),
    correctOptionIndex: 0,
    correctResponse: "",
    incorrectResponse: "",
  };
}

export function normalizeCheckpointQuiz(quiz: CheckpointQuiz): CheckpointQuiz {
  const options = Array.from({ length: CHECKPOINT_QUIZ_OPTION_COUNT }, (_, index) =>
    (quiz.options[index] ?? "").trim(),
  );

  return {
    question: quiz.question.trim(),
    options,
    correctOptionIndex: quiz.correctOptionIndex,
    correctResponse: quiz.correctResponse.trim(),
    incorrectResponse: quiz.incorrectResponse.trim(),
  };
}

export function parseCheckpointQuiz(value: unknown): CheckpointQuiz | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.question !== "string" ||
    typeof record.correctResponse !== "string" ||
    typeof record.incorrectResponse !== "string" ||
    !Array.isArray(record.options)
  ) {
    return undefined;
  }

  const correctOptionIndex =
    typeof record.correctOptionIndex === "number"
      ? record.correctOptionIndex
      : Number(record.correctOptionIndex);

  if (!Number.isInteger(correctOptionIndex)) {
    return undefined;
  }

  const options = record.options
    .filter((option): option is string => typeof option === "string")
    .slice(0, CHECKPOINT_QUIZ_OPTION_COUNT);

  while (options.length < CHECKPOINT_QUIZ_OPTION_COUNT) {
    options.push("");
  }

  return {
    question: record.question,
    options,
    correctOptionIndex,
    correctResponse: record.correctResponse,
    incorrectResponse: record.incorrectResponse,
  };
}

function validateCheckpointQuizSettings(
  quiz: CheckpointQuiz | undefined,
): string | null {
  if (!quiz) {
    return "Multiple-choice question is required.";
  }

  const normalized = normalizeCheckpointQuiz(quiz);

  if (!normalized.question) {
    return "Quiz question is required.";
  }

  if (normalized.options.some((option) => !option)) {
    return "All four answer options are required.";
  }

  if (
    normalized.correctOptionIndex < 0 ||
    normalized.correctOptionIndex >= CHECKPOINT_QUIZ_OPTION_COUNT
  ) {
    return "Select the correct answer option.";
  }

  if (!normalized.correctResponse) {
    return "Correct answer response is required.";
  }

  if (!normalized.incorrectResponse) {
    return "Incorrect answer response is required.";
  }

  return null;
}

function validatePresetPromptSettings(input: BoothInput): string | null {
  if (!input.presetPromptsEnabled) {
    return null;
  }

  if (!isPromptBasedAiFeature(input.feature)) {
    return "Pre-set prompts are only available for text-to-image and text generator features.";
  }

  const prompts = input.presetPrompts ?? [];

  if (prompts.length === 0) {
    return "Add at least one pre-set prompt.";
  }

  for (const [index, item] of prompts.entries()) {
    const name = item.name.trim();
    const prompt = item.prompt.trim();

    if (!name && !prompt) {
      continue;
    }

    if (!name) {
      return `Pre-set prompt ${index + 1} needs a name.`;
    }

    if (!prompt) {
      return `Pre-set prompt "${name}" needs a full prompt statement.`;
    }
  }

  const normalized = normalizePresetPrompts(prompts);

  if (normalized.length === 0) {
    return "Add at least one pre-set prompt.";
  }

  const names = normalized.map((item) => item.name.toLowerCase());
  if (new Set(names).size !== names.length) {
    return "Each pre-set prompt name must be unique.";
  }

  return null;
}

function validateSubmissionSettings(input: BoothInput): string | null {
  if (input.feature !== "submission") {
    return null;
  }

  if (!input.submissionType || !isSubmissionType(input.submissionType)) {
    return "Submission type is required.";
  }

  if (!input.submissionInstruction?.trim()) {
    return "Submission instructions are required.";
  }

  return null;
}

export function validateVenueInput(
  input: BoothInput,
  venueType: BoothType,
): string | null {
  const id = normalizeBoothId(input.id);

  if (!VENUE_ID_PATTERNS[venueType].test(id)) {
    return `ID must look like ${VENUE_ID_HINTS[venueType]}.`;
  }

  if (!input.title.trim()) {
    return "Title is required.";
  }

  if (venueType === "booth") {
    const code = normalizeBoothCode(input.code);

    if (!/^\d{3}$/.test(code)) {
      return "Code must be exactly 3 digits.";
    }

    if (!Number.isFinite(input.points) || input.points < 0) {
      return "Points must be zero or greater.";
    }

    if (input.feature && !isBoothFeature(input.feature)) {
      return "Invalid feature.";
    }

    const submissionError = validateSubmissionSettings(input);
    if (submissionError) {
      return submissionError;
    }

    const presetPromptError = validatePresetPromptSettings(input);
    if (presetPromptError) {
      return presetPromptError;
    }
  }

  if (venueType === "checkpoint") {
    const code = normalizeBoothCode(input.code);

    if (!/^\d{3}$/.test(code)) {
      return "Code must be exactly 3 digits.";
    }

    if (!Number.isFinite(input.points) || input.points < 0) {
      return "Points must be zero or greater.";
    }

    if (!input.checkpointMode || !isCheckpointMode(input.checkpointMode)) {
      return "Checkpoint mode is required.";
    }

    if (input.checkpointMode === "code_and_quiz") {
      const quizError = validateCheckpointQuizSettings(input.checkpointQuiz);
      if (quizError) {
        return quizError;
      }
    }

    if (input.checkpointMode === "code_and_image") {
      if (!input.submissionInstruction?.trim()) {
        return "Submission instructions are required.";
      }
    }
  }

  if (venueType === "workshop") {
    if (input.feature && !isBoothFeature(input.feature)) {
      return "Invalid feature.";
    }

    const submissionError = validateSubmissionSettings(input);
    if (submissionError) {
      return submissionError;
    }

    const presetPromptError = validatePresetPromptSettings(input);
    if (presetPromptError) {
      return presetPromptError;
    }
  }

  return null;
}

export function validateBoothInput(input: BoothInput): string | null {
  if (!isBoothType(input.type)) {
    return "Type must be booth, checkpoint, or workshop.";
  }

  return validateVenueInput(input, input.type);
}

export function toBoothDocument(input: BoothInput): BoothDocument {
  const id = normalizeBoothId(input.id);
  const document: BoothDocument = {
    id,
    title: input.title.trim(),
    code:
      input.type === "workshop"
        ? workshopCodeFromId(id)
        : normalizeBoothCode(input.code),
    points: input.type === "workshop" ? 0 : input.points,
    type: input.type,
    description: input.description.trim(),
  };

  const helperName = input.helperName?.trim();
  if (helperName) {
    document.helperName = helperName;
  }

  const posterImageUrl = normalizePosterImageUrl(input.posterImageUrl);
  if (posterImageUrl) {
    document.posterImageUrl = posterImageUrl;
  }

  if (input.feature) {
    document.feature = input.feature;
  }

  if (deriveAiEnabledFromFeature(input.feature)) {
    document.aiEnabled = true;
  }

  if (input.feature === "submission") {
    if (input.submissionType) {
      document.submissionType = input.submissionType;
    }

    const submissionInstruction = input.submissionInstruction?.trim();
    if (submissionInstruction) {
      document.submissionInstruction = submissionInstruction;
    }
  }

  if (input.checkpointMode) {
    document.checkpointMode = input.checkpointMode;
  }

  if (
    input.checkpointMode === "code_and_quiz" &&
    input.checkpointQuiz
  ) {
    document.checkpointQuiz = normalizeCheckpointQuiz(input.checkpointQuiz);
  }

  if (input.checkpointMode === "code_and_image") {
    document.feature = "submission";
    document.submissionType = "image";

    const submissionInstruction = input.submissionInstruction?.trim();
    if (submissionInstruction) {
      document.submissionInstruction = submissionInstruction;
    }
  }

  if (input.workshopSlides && input.workshopSlides.length > 0) {
    document.workshopSlides = input.workshopSlides;
  }

  if (
    isPromptBasedAiFeature(input.feature) &&
    input.presetPromptsEnabled
  ) {
    document.presetPromptsEnabled = true;
    document.presetPrompts = normalizePresetPrompts(input.presetPrompts ?? []);
  }

  return document;
}

export function boothTypeLabel(type: BoothType): string {
  switch (type) {
    case "booth":
      return "Booth";
    case "checkpoint":
      return "Checkpoint";
    case "workshop":
      return "Workshop";
  }
}

export function venueIdPlaceholder(type: BoothType): string {
  return VENUE_ID_HINTS[type];
}

export function venueIdMaxLength(type: BoothType): number {
  return type === "booth" ? 3 : 3;
}

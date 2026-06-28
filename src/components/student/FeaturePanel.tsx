"use client";

import Image from "next/image";
import { useState, type ChangeEvent } from "react";

import {
  generateAiImage,
  generateAiText,
  generateAiVideo,
  isAiServiceConfigured,
} from "@/lib/aiServiceClient";
import {
  isAiBoothFeature,
  type BoothDocument,
  type BoothFeature,
  type SubmissionType,
} from "@/lib/booths";
import { studentBoothFeatureLabel } from "@/lib/studentUi";
import { boothTypeStyles } from "@/lib/boothStyles";
import { saveStudentWork } from "@/lib/studentWorksClient";

type FeaturePanelProps = {
  venue: BoothDocument;
  studentId: string;
  getToken: () => Promise<string>;
};

type GeneratedPayload = {
  prompt?: string;
  generatedText?: string;
  imageUrl?: string;
  videoUrl?: string;
  submissionText?: string;
  submissionUrl?: string;
};

export function FeaturePanel({
  venue,
  studentId,
  getToken,
}: FeaturePanelProps) {
  const feature = venue.feature;

  if (!feature) {
    return null;
  }

  const styles = boothTypeStyles[venue.type];
  const venueTypeLabel = venue.type === "workshop" ? "工作坊" : "攤位";
  const venueType = venue.type === "workshop" ? "workshop" : "booth";

  return (
    <section className="mt-8 rounded-3xl border border-slate-100 bg-slate-50/70 p-5 sm:p-6">
      {isAiBoothFeature(feature) ? (
        <p className="mb-4 rounded-2xl bg-violet-100 px-4 py-3 text-center text-base font-semibold text-violet-900">
          在此{venueTypeLabel}體驗 AI！
        </p>
      ) : null}

      <h2 className="text-center text-2xl font-bold text-slate-800">
        {studentBoothFeatureLabel(feature)}活動
      </h2>
      <p className="mt-2 text-center text-base text-slate-600">
        {feature === "submission"
          ? venue.submissionInstruction?.trim() ||
            "請在下方完成你的作品，然後提交給助手及老師審閱。"
          : "請在下方生成你的作品，然後提交給助手及老師審閱。"}
      </p>

      <FeatureForm
        feature={feature}
        venue={venue}
        venueId={venue.id}
        studentId={studentId}
        styles={styles}
        getToken={getToken}
        onSubmit={async (payload) => {
          const token = await getToken();
          await saveStudentWork(token, {
            studentId,
            input: {
              venueId: venue.id,
              venueType,
              feature,
              ...payload,
            },
          });
        }}
      />
    </section>
  );
}

type FeatureFormProps = {
  feature: BoothFeature;
  venue: BoothDocument;
  venueId: string;
  studentId: string;
  styles: (typeof boothTypeStyles)[keyof typeof boothTypeStyles];
  getToken: () => Promise<string>;
  onSubmit: (payload: GeneratedPayload) => Promise<void>;
};

function isValidHyperlink(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function FeatureForm({
  feature,
  venue,
  venueId,
  studentId,
  styles,
  getToken,
  onSubmit,
}: FeatureFormProps) {
  const submissionType: SubmissionType =
    venue.submissionType ?? "text";
  const [prompt, setPrompt] = useState("");
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(
    null,
  );
  const presetPrompts =
    venue.presetPromptsEnabled && venue.presetPrompts?.length
      ? venue.presetPrompts
      : [];
  const [submissionText, setSubmissionText] = useState("");
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [uploadDataUrl, setUploadDataUrl] = useState<string | null>(null);
  const [generatedPayload, setGeneratedPayload] = useState<GeneratedPayload | null>(
    null,
  );
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const aiConfigured = isAiServiceConfigured();
  const canSubmit =
    feature === "submission"
      ? submissionType === "text"
        ? submissionText.trim().length > 0
        : submissionType === "image"
          ? Boolean(uploadDataUrl)
          : isValidHyperlink(submissionUrl.trim())
      : generatedPayload !== null;

  async function handleGenerateImage() {
    if (!prompt.trim()) {
      setError("請先輸入提示內容。");
      return;
    }

    if (!aiConfigured) {
      setError("AI 服務尚未設定。");
      return;
    }

    setGenerating(true);
    setMessage(null);
    setError(null);

    try {
      const token = await getToken();
      const result = await generateAiImage(token, {
        prompt: prompt.trim(),
        userId: studentId,
        boothId: venueId,
      });

      setPreviewImageUrl(result.imageUrl);
      setGeneratedPayload({
        prompt: prompt.trim(),
        imageUrl: result.imageUrl,
      });
      setMessage("圖像已準備好。滿意後即可提交作品。");
    } catch (generateError) {
      console.error(generateError);
      setError(
        generateError instanceof Error
          ? generateError.message
          : "無法生成圖像。",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateText() {
    if (!prompt.trim()) {
      setError("請先輸入提示內容。");
      return;
    }

    if (!aiConfigured) {
      setError("AI 服務尚未設定。");
      return;
    }

    setGenerating(true);
    setMessage(null);
    setError(null);

    try {
      const token = await getToken();
      const result = await generateAiText(token, {
        prompt: prompt.trim(),
        userId: studentId,
        boothId: venueId,
      });

      setPreviewText(result.generatedText);
      setGeneratedPayload({
        prompt: prompt.trim(),
        generatedText: result.generatedText,
      });
      setMessage("內容已準備好。滿意後即可提交作品。");
    } catch (generateError) {
      console.error(generateError);
      setError(
        generateError instanceof Error
          ? generateError.message
          : "無法生成文字。",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleCreateVideo() {
    if (!uploadDataUrl || !uploadName) {
      setError("請先選擇圖片。");
      return;
    }

    if (!aiConfigured) {
      setError("AI 服務尚未設定。");
      return;
    }

    setGenerating(true);
    setMessage(null);
    setError(null);

    try {
      const token = await getToken();
      const result = await generateAiVideo(token, {
        imageUrl: uploadDataUrl,
        prompt: uploadName,
        userId: studentId,
        boothId: venueId,
      });

      setPreviewImageUrl(uploadDataUrl);
      setPreviewVideoUrl(result.videoUrl);
      setGeneratedPayload({
        imageUrl: uploadDataUrl,
        videoUrl: result.videoUrl,
        prompt: uploadName,
      });
      setMessage("影片已準備好。滿意後即可提交作品。");
    } catch (generateError) {
      console.error(generateError);
      setError(
        generateError instanceof Error
          ? generateError.message
          : "無法製作影片。",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmitWork() {
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      if (feature === "submission") {
        if (submissionType === "text") {
          if (!submissionText.trim()) {
            throw new Error("請先填寫你的作品。");
          }

          await onSubmit({ submissionText: submissionText.trim() });
          setSubmissionText("");
          setMessage("作品已儲存。");
          return;
        }

        if (submissionType === "image") {
          if (!uploadDataUrl) {
            throw new Error("請先上載圖片。");
          }

          await onSubmit({ imageUrl: uploadDataUrl });
          setUploadDataUrl(null);
          setUploadName(null);
          setPreviewImageUrl(null);
          setMessage("作品已儲存。");
          return;
        }

        const trimmedUrl = submissionUrl.trim();
        if (!isValidHyperlink(trimmedUrl)) {
          throw new Error("請輸入有效的 http 或 https 連結。");
        }

        await onSubmit({ submissionUrl: trimmedUrl });
        setSubmissionUrl("");
        setMessage("作品已儲存。");
        return;
      }

      if (!generatedPayload) {
        throw new Error("請先生成作品，然後再提交。");
      }

      await onSubmit(generatedPayload);
      setGeneratedPayload(null);
      setMessage("作品已提交審閱。");
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "無法儲存你的作品。",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setUploadName(file?.name ?? null);
    setPreviewImageUrl(null);
    setPreviewVideoUrl(null);
    setGeneratedPayload(null);
    setMessage(null);
    setError(null);

    if (!file) {
      setUploadDataUrl(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      setUploadDataUrl(result);
      if (result) {
        setPreviewImageUrl(result);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="mt-6 space-y-5">
      {feature === "text-to-image" || feature === "text-generator" ? (
        <>
          {presetPrompts.length > 0 ? (
            <div>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                預設提示
              </span>
              <div className="flex flex-wrap gap-2">
                {presetPrompts.map((preset, index) => {
                  const isSelected = selectedPresetIndex === index;

                  return (
                    <button
                      key={`${preset.name}-${index}`}
                      type="button"
                      onClick={() => {
                        setPrompt(preset.prompt);
                        setSelectedPresetIndex(index);
                        setError(null);
                      }}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-4 ${
                        isSelected
                          ? `${styles.accentButton} text-white ${styles.accentRing}`
                          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-200"
                      }`}
                    >
                      {preset.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              你的提示
            </span>
            <textarea
              value={prompt}
              onChange={(event) => {
                setPrompt(event.target.value);
                setSelectedPresetIndex(null);
              }}
              rows={4}
              placeholder={
                feature === "text-to-image"
                  ? "描述你想創作的圖像..."
                  : "描述你想 AI 撰寫的故事或答案..."
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            />
          </label>
        </>
      ) : null}

      {feature === "image-to-video" ? (
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            上載圖片
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 file:mr-4 file:rounded-lg file:border-0 file:bg-violet-100 file:px-4 file:py-2 file:font-semibold file:text-violet-800"
          />
          {uploadName ? (
            <p className="mt-2 text-sm text-slate-600">已選擇：{uploadName}</p>
          ) : null}
        </label>
      ) : null}

      {feature === "submission" && submissionType === "text" ? (
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            你的作品
          </span>
          <textarea
            value={submissionText}
            onChange={(event) => setSubmissionText(event.target.value)}
            rows={5}
            placeholder="分享你的答案、感想或項目筆記..."
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
          />
        </label>
      ) : null}

      {feature === "submission" && submissionType === "image" ? (
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            上載你的圖片
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 file:mr-4 file:rounded-lg file:border-0 file:bg-violet-100 file:px-4 file:py-2 file:font-semibold file:text-violet-800"
          />
          {uploadName ? (
            <p className="mt-2 text-sm text-slate-600">已選擇：{uploadName}</p>
          ) : null}
        </label>
      ) : null}

      {feature === "submission" && submissionType === "hyperlink" ? (
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            你的連結
          </span>
          <input
            type="url"
            value={submissionUrl}
            onChange={(event) => setSubmissionUrl(event.target.value)}
            placeholder="https://example.com/your-project"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
          />
        </label>
      ) : null}

      {previewImageUrl &&
      (feature !== "submission" || submissionType === "image") ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <Image
            src={previewImageUrl}
            alt="預覽圖像"
            width={960}
            height={540}
            unoptimized={
              previewImageUrl.startsWith("data:") ||
              previewImageUrl.startsWith("http")
            }
            className="h-auto w-full object-contain"
          />
        </div>
      ) : null}

      {previewText ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-base leading-relaxed text-slate-700">
          {previewText}
        </div>
      ) : null}

      {previewVideoUrl ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <video
            src={previewVideoUrl}
            controls
            className="h-auto w-full object-contain"
          />
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-base text-red-700">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-base text-emerald-800">
          {message}
        </p>
      ) : null}

      {feature === "text-to-image" ? (
        <button
          type="button"
          disabled={generating || submitting}
          onClick={() => void handleGenerateImage()}
          className={`w-full rounded-3xl px-6 py-5 text-2xl font-bold text-white transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${styles.accentButton} ${styles.accentButtonHover} ${styles.accentRing}`}
        >
          {generating ? "生成圖像中..." : "生成圖像"}
        </button>
      ) : null}

      {feature === "text-generator" ? (
        <button
          type="button"
          disabled={generating || submitting}
          onClick={() => void handleGenerateText()}
          className={`w-full rounded-3xl px-6 py-5 text-2xl font-bold text-white transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${styles.accentButton} ${styles.accentButtonHover} ${styles.accentRing}`}
        >
          {generating ? "生成文字中..." : "生成文字"}
        </button>
      ) : null}

      {feature === "image-to-video" ? (
        <button
          type="button"
          disabled={generating || submitting}
          onClick={() => void handleCreateVideo()}
          className={`w-full rounded-3xl px-6 py-5 text-2xl font-bold text-white transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${styles.accentButton} ${styles.accentButtonHover} ${styles.accentRing}`}
        >
          {generating ? "製作影片中..." : "製作影片"}
        </button>
      ) : null}

      <button
        type="button"
        disabled={submitting || generating || !canSubmit}
        onClick={() => void handleSubmitWork()}
        className="w-full rounded-3xl border-2 border-slate-300 bg-white px-6 py-5 text-2xl font-bold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "提交中..." : feature === "submission" ? "提交" : "提交作品"}
      </button>
    </div>
  );
}

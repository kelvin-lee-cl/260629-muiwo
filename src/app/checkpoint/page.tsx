"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
  type SyntheticEvent,
} from "react";

import { useStudent } from "@/contexts/StudentContext";
import { readCompressedImageDataUrl } from "@/lib/compressImageFile";
import { normalizeBoothCode, normalizePosterImageUrl } from "@/lib/booths";
import { claimBoothCode } from "@/lib/claimClient";
import {
  checkCheckpointQuiz,
  previewCheckpointCode,
  type CheckpointPreview,
} from "@/lib/checkpointClient";
import { saveStudentWork } from "@/lib/studentWorksClient";
import { formatPointsLabel } from "@/lib/studentUi";

type GamePhase =
  | "enter-code"
  | "quiz"
  | "image-upload"
  | "claiming"
  | "success"
  | "already-claimed"
  | "failed";

export default function CheckpointPage() {
  return <CheckpointGame />;
}

function CheckpointGame() {
  const router = useRouter();
  const { authUser, studentId } = useStudent();

  const [phase, setPhase] = useState<GamePhase>("enter-code");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CheckpointPreview | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizAttempt, setQuizAttempt] = useState(1);
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [uploadDataUrl, setUploadDataUrl] = useState<string | null>(null);
  const [pointsAwarded, setPointsAwarded] = useState(0);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (phase !== "failed") {
      return;
    }

    const timer = window.setTimeout(() => {
      router.replace("/dashboard");
    }, 3200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [phase, router]);

  function resetGame() {
    setPhase("enter-code");
    setCode("");
    setError(null);
    setPreview(null);
    setSelectedOption(null);
    setQuizAttempt(1);
    setQuizFeedback(null);
    setUploadName(null);
    setUploadDataUrl(null);
    setPointsAwarded(0);
    setSuccessMessage("");
  }

  function handleCodeChange(event: ChangeEvent<HTMLInputElement>) {
    setCode(normalizeBoothCode(event.target.value));
    setError(null);
  }

  async function claimPoints(
    checkpoint: CheckpointPreview,
    enteredCode: string,
    submissionWorkId?: string,
  ) {
    if (!authUser || !studentId) {
      throw new Error("尚未登入。");
    }

    setPhase("claiming");

    try {
      const token = await authUser.getIdToken();
      const result = await claimBoothCode(token, {
        studentId,
        boothId: checkpoint.boothId,
        enteredCode,
        submissionWorkId,
      });

      setPointsAwarded(result.pointsAwarded);
      setSuccessMessage(
        checkpoint.hasQuiz
          ? "太棒了！你成功破解了關卡挑戰！"
          : checkpoint.hasImageUpload
            ? "圖片已提交！分數已加入你的總分！"
            : "關卡解鎖！分數已加入你的總分！",
      );
      setPhase("success");
    } catch (claimError) {
      setPhase(
        checkpoint.hasQuiz
          ? "quiz"
          : checkpoint.hasImageUpload
            ? "image-upload"
            : "enter-code",
      );
      throw claimError;
    }
  }

  async function handleCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authUser || !studentId || busy) {
      return;
    }

    if (code.length !== 3) {
      setError("請輸入完整的 3 位數密碼。");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const token = await authUser.getIdToken();
      const nextPreview = await previewCheckpointCode(token, {
        studentId,
        enteredCode: code,
      });

      setPreview(nextPreview);

      if (nextPreview.alreadyClaimed) {
        setPhase("already-claimed");
        return;
      }

      if (nextPreview.hasQuiz && nextPreview.quiz) {
        setQuizAttempt((nextPreview.quizAttemptsUsed ?? 0) + 1);
        setSelectedOption(null);
        setQuizFeedback(null);
        setPhase("quiz");
        return;
      }

      if (nextPreview.hasQuiz && nextPreview.quizExhausted) {
        setQuizFeedback("你已用完所有答題機會。");
        setPhase("failed");
        return;
      }

      if (nextPreview.hasImageUpload) {
        setUploadName(null);
        setUploadDataUrl(null);
        setPhase("image-upload");
        return;
      }

      await claimPoints(nextPreview, code);
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "此密碼無效，請再試一次！",
      );
      setPhase("enter-code");
    } finally {
      setBusy(false);
    }
  }

  async function handleQuizSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authUser || !preview || !studentId || busy || selectedOption === null) {
      setError("請選擇一個答案。");
      return;
    }

    setBusy(true);
    setError(null);
    setQuizFeedback(null);

    try {
      const token = await authUser.getIdToken();
      const result = await checkCheckpointQuiz(token, {
        studentId,
        enteredCode: code,
        selectedOptionIndex: selectedOption,
      });

      if (result.correct) {
        await claimPoints(preview, code);
        return;
      }

      if (result.exhausted) {
        setQuizFeedback(result.message || "抱歉，答案不正確。");
        setPhase("failed");
        return;
      }

      setQuizAttempt((result.wrongAttempts ?? 0) + 1);
      setSelectedOption(null);
      setQuizFeedback(result.message || "不太對喔！你還有一次機會。");
    } catch (quizError) {
      console.error(quizError);
      setError(
        quizError instanceof Error
          ? quizError.message
          : "無法確認你的答案。",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setUploadName(file?.name ?? null);
    setUploadDataUrl(null);
    setError(null);

    if (!file) {
      return;
    }

    try {
      const dataUrl = await readCompressedImageDataUrl(file);
      setUploadDataUrl(dataUrl);
    } catch (imageError) {
      console.error(imageError);
      setUploadName(null);
      setError(
        imageError instanceof Error
          ? imageError.message
          : "無法讀取圖片。",
      );
    }
  }

  async function handleImageSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authUser || !studentId || !preview || busy) {
      return;
    }

    if (!uploadDataUrl) {
      setError("請先上載圖片。");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const token = await authUser.getIdToken();
      const work = await saveStudentWork(token, {
        studentId,
        input: {
          venueId: preview.boothId,
          venueType: "checkpoint",
          feature: "submission",
          imageUrl: uploadDataUrl,
        },
      });

      await claimPoints(preview, code, work.id);
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "無法提交圖片。",
      );
      setPhase("image-upload");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center py-6 sm:py-10">
      <div className="w-full max-w-xl rounded-[2rem] border-2 border-emerald-300 bg-transparent p-6 sm:p-8">
        <p className="text-center text-sm font-bold uppercase tracking-[0.35em] text-emerald-600">
          關卡任務
        </p>

          {phase === "enter-code" ? (
            <EnterCodePhase
              code={code}
              busy={busy}
              error={error}
              onCodeChange={handleCodeChange}
              onSubmit={handleCodeSubmit}
            />
          ) : null}

          {phase === "quiz" ? (
            <QuizPhase
              preview={preview}
              selectedOption={selectedOption}
              quizAttempt={quizAttempt}
              quizFeedback={quizFeedback}
              busy={busy}
              error={error}
              onSelectOption={setSelectedOption}
              onSubmit={handleQuizSubmit}
              onBack={resetGame}
            />
          ) : null}

          {phase === "image-upload" ? (
            <ImageUploadPhase
              preview={preview}
              uploadName={uploadName}
              uploadDataUrl={uploadDataUrl}
              busy={busy}
              error={error}
              onImageChange={handleImageChange}
              onSubmit={handleImageSubmit}
              onBack={resetGame}
            />
          ) : null}

          {phase === "claiming" ? <LoadingPhase message="正在發放分數..." /> : null}

          {phase === "success" ? (
            <SuccessPhase
              title={preview?.title ?? "關卡"}
              posterImageUrl={preview?.posterImageUrl}
              pointsAwarded={pointsAwarded}
              message={successMessage}
            />
          ) : null}

          {phase === "already-claimed" ? (
            <AlreadyClaimedPhase
              title={preview?.title ?? "關卡"}
              posterImageUrl={preview?.posterImageUrl}
              onPlayAgain={resetGame}
            />
          ) : null}

          {phase === "failed" ? (
            <FailedPhase message={quizFeedback ?? "抱歉，這次未能獲得分數。"} />
          ) : null}
      </div>

      {phase !== "failed" ? (
        <Link
          href="/dashboard"
          className="mt-6 text-base font-semibold text-emerald-700 underline-offset-4 hover:text-emerald-900 hover:underline"
        >
          返回主頁
        </Link>
      ) : null}
    </main>
  );
}

function CheckpointPosterImage({
  title,
  posterImageUrl,
}: {
  title: string;
  posterImageUrl?: string;
}) {
  const normalizedPosterImageUrl = normalizePosterImageUrl(posterImageUrl);
  const [imageHidden, setImageHidden] = useState(false);

  useEffect(() => {
    setImageHidden(false);
  }, [normalizedPosterImageUrl]);

  if (!normalizedPosterImageUrl || imageHidden) {
    return null;
  }

  function handleImageError(event: SyntheticEvent<HTMLImageElement>) {
    event.currentTarget.style.display = "none";
    setImageHidden(true);
  }

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border-2 border-emerald-300 bg-transparent">
      <Image
        src={normalizedPosterImageUrl}
        alt={`${title} 關卡圖片`}
        width={960}
        height={540}
        unoptimized={normalizedPosterImageUrl.startsWith("data:")}
        onError={handleImageError}
        className="h-auto w-full object-contain"
      />
    </div>
  );
}

function EnterCodePhase({
  code,
  busy,
  error,
  onCodeChange,
  onSubmit,
}: {
  code: string;
  busy: boolean;
  error: string | null;
  onCodeChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <>
      <h1 className="mt-3 text-center text-4xl font-black text-emerald-900 sm:text-5xl">
        輸入秘密密碼
      </h1>
      <p className="mt-3 text-center text-lg text-emerald-700">
        輸入關卡助手提供的 3 位數密碼以開始。
      </p>

      <form className="mt-8 space-y-5" onSubmit={onSubmit}>
        <input
          type="text"
          inputMode="numeric"
          maxLength={3}
          value={code}
          onChange={onCodeChange}
          placeholder="000"
          autoComplete="off"
          className="w-full rounded-3xl border-2 border-emerald-300 bg-transparent px-4 py-6 text-center text-6xl font-black tracking-[0.45em] text-emerald-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 sm:text-7xl"
        />

        {error ? (
          <p className="rounded-2xl border border-red-300 px-4 py-3 text-center text-base font-semibold text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy || code.length !== 3}
          className="w-full rounded-3xl border-2 border-emerald-400 bg-transparent px-6 py-5 text-2xl font-black text-emerald-800 transition hover:border-emerald-500 hover:text-emerald-900 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "確認中..." : "解鎖關卡"}
        </button>
      </form>
    </>
  );
}

function QuizPhase({
  preview,
  selectedOption,
  quizAttempt,
  quizFeedback,
  busy,
  error,
  onSelectOption,
  onSubmit,
  onBack,
}: {
  preview: CheckpointPreview | null;
  selectedOption: number | null;
  quizAttempt: number;
  quizFeedback: string | null;
  busy: boolean;
  error: string | null;
  onSelectOption: (index: number) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
}) {
  const quiz = preview?.quiz;

  if (!quiz) {
    return null;
  }

  return (
    <>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="rounded-full border border-emerald-300 px-4 py-1 text-sm font-bold text-emerald-700">
          {preview.title}
        </span>
        <span className="rounded-full border border-emerald-300 px-4 py-1 text-sm font-bold text-emerald-700">
          第 {quizAttempt} 次／共 2 次
        </span>
      </div>

      <h1 className="mt-5 text-center text-3xl font-black text-emerald-900 sm:text-4xl">
        加分挑戰！
      </h1>
      <p className="mt-3 text-center text-lg text-emerald-700">
        答對即可獲得 {preview.points} 分。
      </p>

      <CheckpointPosterImage
        title={preview.title}
        posterImageUrl={preview.posterImageUrl}
      />

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <p className="rounded-2xl border-2 border-emerald-300 px-5 py-4 text-xl font-semibold leading-relaxed text-emerald-900">
          {quiz.question}
        </p>

        <div className="space-y-3">
          {quiz.options.map((option, index) => {
            const selected = selectedOption === index;

            return (
              <button
                key={`${preview.boothId}-option-${index}`}
                type="button"
                onClick={() => onSelectOption(index)}
                disabled={busy}
                className={`flex w-full items-center gap-4 rounded-2xl border-2 px-4 py-4 text-left text-lg font-semibold transition ${
                  selected
                    ? "border-emerald-500 text-emerald-900"
                    : "border-emerald-200 text-emerald-800 hover:border-emerald-400"
                }`}
              >
                <span
                  className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-base font-black ${
                    selected
                      ? "border-emerald-500 text-emerald-800"
                      : "border-emerald-300 text-emerald-700"
                  }`}
                >
                  {String.fromCharCode(65 + index)}
                </span>
                <span>{option}</span>
              </button>
            );
          })}
        </div>

        {quizFeedback ? (
          <p className="rounded-2xl border border-amber-300 px-4 py-3 text-center text-base font-semibold text-amber-800">
            {quizFeedback}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-2xl border border-red-300 px-4 py-3 text-center text-base font-semibold text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy || selectedOption === null}
          className="w-full rounded-3xl border-2 border-emerald-400 bg-transparent px-6 py-5 text-2xl font-black text-emerald-800 transition hover:border-emerald-500 hover:text-emerald-900 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "確認中..." : "提交答案"}
        </button>

        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          className="w-full rounded-2xl border border-emerald-300 bg-transparent px-6 py-3 text-base font-semibold text-emerald-700 transition hover:border-emerald-400 hover:text-emerald-900"
        >
          輸入其他密碼
        </button>
      </form>
    </>
  );
}

function ImageUploadPhase({
  preview,
  uploadName,
  uploadDataUrl,
  busy,
  error,
  onImageChange,
  onSubmit,
  onBack,
}: {
  preview: CheckpointPreview | null;
  uploadName: string | null;
  uploadDataUrl: string | null;
  busy: boolean;
  error: string | null;
  onImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
}) {
  if (!preview) {
    return null;
  }

  return (
    <>
      <div className="mt-4 flex items-center justify-center">
        <span className="rounded-full border border-emerald-300 px-4 py-1 text-sm font-bold text-emerald-700">
          {preview.title}
        </span>
      </div>

      <h1 className="mt-5 text-center text-3xl font-black text-emerald-900 sm:text-4xl">
        上載圖片
      </h1>
      <p className="mt-3 text-center text-lg text-emerald-700">
        {preview.submissionInstruction?.trim() ||
          "請上載圖片以獲得 " + preview.points + " 分。"}
      </p>

      <CheckpointPosterImage
        title={preview.title}
        posterImageUrl={preview.posterImageUrl}
      />

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-emerald-800">
            選擇圖片
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={onImageChange}
            disabled={busy}
            className="block w-full rounded-2xl border-2 border-emerald-300 bg-transparent px-4 py-3 text-base text-emerald-800 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-4 file:py-2 file:font-semibold file:text-emerald-800"
          />
          {uploadName ? (
            <p className="mt-2 text-sm text-emerald-700">已選擇：{uploadName}</p>
          ) : null}
        </label>

        {uploadDataUrl ? (
          <div className="overflow-hidden rounded-2xl border-2 border-emerald-300 bg-transparent">
            <Image
              src={uploadDataUrl}
              alt="預覽圖像"
              width={960}
              height={540}
              unoptimized
              className="h-auto w-full object-contain"
            />
          </div>
        ) : null}

        {error ? (
          <p className="rounded-2xl border border-red-300 px-4 py-3 text-center text-base font-semibold text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy || !uploadDataUrl}
          className="w-full rounded-3xl border-2 border-emerald-400 bg-transparent px-6 py-5 text-2xl font-black text-emerald-800 transition hover:border-emerald-500 hover:text-emerald-900 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "提交中..." : "提交並領取分數"}
        </button>

        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          className="w-full rounded-2xl border border-emerald-300 bg-transparent px-6 py-3 text-base font-semibold text-emerald-700 transition hover:border-emerald-400 hover:text-emerald-900"
        >
          輸入其他密碼
        </button>
      </form>
    </>
  );
}

function LoadingPhase({ message }: { message: string }) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-500" />
      <p className="mt-6 text-xl font-bold text-emerald-800">{message}</p>
    </div>
  );
}

function SuccessPhase({
  title,
  posterImageUrl,
  pointsAwarded,
  message,
}: {
  title: string;
  posterImageUrl?: string;
  pointsAwarded: number;
  message: string;
}) {
  return (
    <div className="py-8 text-center">
      <div className="text-7xl">🏆</div>
      <h1 className="mt-4 text-4xl font-black text-emerald-800 sm:text-5xl">
        恭喜！
      </h1>
      <p className="mt-3 text-xl font-semibold text-emerald-900">{title}</p>
      <CheckpointPosterImage title={title} posterImageUrl={posterImageUrl} />
      <p className="mt-4 text-lg text-emerald-700">{message}</p>
      <p className="mt-6 inline-flex rounded-full border-2 border-emerald-400 px-6 py-3 text-3xl font-black text-emerald-800">
        +{formatPointsLabel(pointsAwarded)}
      </p>
      <Link
        href="/dashboard"
        className="mt-8 inline-flex w-full items-center justify-center rounded-3xl border-2 border-emerald-400 px-6 py-4 text-xl font-black text-emerald-800 transition hover:border-emerald-500 hover:text-emerald-900"
      >
        返回主頁
      </Link>
    </div>
  );
}

function AlreadyClaimedPhase({
  title,
  posterImageUrl,
  onPlayAgain,
}: {
  title: string;
  posterImageUrl?: string;
  onPlayAgain: () => void;
}) {
  return (
    <div className="py-8 text-center">
      <div className="text-6xl">✅</div>
      <h1 className="mt-4 text-3xl font-black text-emerald-900">已領取</h1>
      <p className="mt-3 text-lg text-emerald-700">
        你已在 {title} 獲得分數。
      </p>
      <CheckpointPosterImage title={title} posterImageUrl={posterImageUrl} />
      <button
        type="button"
        onClick={onPlayAgain}
        className="mt-8 w-full rounded-3xl border-2 border-emerald-400 bg-transparent px-6 py-4 text-xl font-black text-emerald-800 transition hover:border-emerald-500 hover:text-emerald-900"
      >
        試試其他密碼
      </button>
      <Link
        href="/dashboard"
        className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-emerald-300 px-6 py-3 text-lg font-semibold text-emerald-700 transition hover:border-emerald-400 hover:text-emerald-900"
      >
        返回主頁
      </Link>
    </div>
  );
}

function FailedPhase({ message }: { message: string }) {
  return (
    <div className="py-10 text-center">
      <div className="text-7xl">😔</div>
      <h1 className="mt-4 text-4xl font-black text-emerald-900">抱歉！</h1>
      <p className="mt-4 text-lg text-emerald-700">{message}</p>
      <p className="mt-4 text-base text-emerald-600">
        正在返回你的主頁...
      </p>
    </div>
  );
}

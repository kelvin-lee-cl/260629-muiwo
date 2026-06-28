"use client";

import Image from "next/image";
import { doc, getDoc } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";

import { useStudent } from "@/contexts/StudentContext";
import { StudentPageShell } from "@/components/StudentPageShell";
import { FeaturePanel } from "@/components/student/FeaturePanel";
import { VenueCodeClaim } from "@/components/student/VenueCodeClaim";
import {
  VenueHeader,
  venueCardClassName,
} from "@/components/student/VenueHeader";
import { normalizeBoothCode, type BoothDocument } from "@/lib/booths";
import { fetchBoothFromFirestore } from "@/lib/boothsClient";
import { readCompressedImageDataUrl } from "@/lib/compressImageFile";
import { claimBoothCode } from "@/lib/claimClient";
import { getClientDb } from "@/lib/firebaseClient";
import { saveStudentWork } from "@/lib/studentWorksClient";

type ToastState = {
  message: string;
  tone: "success" | "error";
};

export default function BoothPage() {
  return <BoothPageContent />;
}

function BoothPageContent() {
  const router = useRouter();
  const params = useParams<{ boothId: string }>();
  const boothId = params.boothId?.toUpperCase() ?? "";
  const { authUser, studentId, loading: authLoading, isStudentSession } = useStudent();

  const [booth, setBooth] = useState<BoothDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [code, setCode] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [scoreRefreshKey, setScoreRefreshKey] = useState(0);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [checkpointImagePhase, setCheckpointImagePhase] = useState(false);
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [uploadDataUrl, setUploadDataUrl] = useState<string | null>(null);

  const isLoggedIn = isStudentSession;
  const isCheckpointImageMode =
    booth?.type === "checkpoint" && booth.checkpointMode === "code_and_image";

  const getToken = useCallback(async () => {
    if (!authUser) {
      throw new Error("尚未登入。");
    }

    return authUser.getIdToken();
  }, [authUser]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 3500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toast]);

  useEffect(() => {
    if (authLoading || !isLoggedIn) {
      return;
    }

    if (!boothId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadBooth() {
      setLoading(true);
      setNotFound(false);

      try {
        const data = await fetchBoothFromFirestore(boothId);

        if (cancelled) {
          return;
        }

        if (!data) {
          setNotFound(true);
          setBooth(null);
          return;
        }

        if (data.type === "workshop") {
          router.replace(`/workshop/${data.id}`);
          return;
        }

        setBooth(data);

        if (authUser) {
          const studentSnap = await getDoc(doc(getClientDb(), "students", authUser.uid));

          if (studentSnap.exists()) {
            const visitedBooths = studentSnap.data().visitedBooths;

            if (Array.isArray(visitedBooths) && visitedBooths.includes(data.id)) {
              setClaimed(true);
            }
          }
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setNotFound(true);
          setBooth(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadBooth();

    return () => {
      cancelled = true;
    };
  }, [authLoading, authUser, boothId, isLoggedIn, router]);

  function handleCodeChange(event: ChangeEvent<HTMLInputElement>) {
    if (claimed) {
      return;
    }

    setCode(normalizeBoothCode(event.target.value));
    setToast(null);
  }

  async function submitCheckpointImage() {
    if (!authUser || !studentId || !booth || claimed || claiming) {
      return;
    }

    if (!uploadDataUrl) {
      setToast({ message: "請先上載圖片。", tone: "error" });
      return;
    }

    setClaiming(true);
    setToast(null);

    try {
      const token = await authUser.getIdToken();

      const work = await saveStudentWork(token, {
        studentId,
        input: {
          venueId: booth.id,
          venueType: "checkpoint",
          feature: "submission",
          imageUrl: uploadDataUrl,
        },
      });

      const result = await claimBoothCode(token, {
        studentId,
        boothId: booth.id,
        enteredCode: code,
        submissionWorkId: work.id,
      });

      setClaimed(true);
      setCheckpointImagePhase(false);
      setUploadName(null);
      setUploadDataUrl(null);
      setScoreRefreshKey((current) => current + 1);
      setToast({
        message: `+${result.pointsAwarded} 分！`,
        tone: "success",
      });
    } catch (claimError) {
      console.error(claimError);
      setToast({
        message:
          claimError instanceof Error
            ? claimError.message
            : "無法領取分數。",
        tone: "error",
      });
    } finally {
      setClaiming(false);
    }
  }

  async function handleClaimSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authUser || !studentId || !booth || claimed || claiming) {
      return;
    }

    if (code.length !== 3) {
      setToast({ message: "請輸入 3 位數密碼。", tone: "error" });
      return;
    }

    if (isCheckpointImageMode && !checkpointImagePhase) {
      if (code !== booth.code) {
        setToast({ message: "密碼錯誤", tone: "error" });
        return;
      }

      setCheckpointImagePhase(true);
      setToast(null);
      return;
    }

    if (isCheckpointImageMode && checkpointImagePhase) {
      return;
    }

    setClaiming(true);
    setToast(null);

    try {
      const token = await authUser.getIdToken();

      const result = await claimBoothCode(token, {
        studentId,
        boothId: booth.id,
        enteredCode: code,
      });

      setClaimed(true);
      setCheckpointImagePhase(false);
      setUploadName(null);
      setUploadDataUrl(null);
      setScoreRefreshKey((current) => current + 1);
      setToast({
        message: `+${result.pointsAwarded} 分！`,
        tone: "success",
      });
    } catch (claimError) {
      console.error(claimError);
      setToast({
        message:
          claimError instanceof Error
            ? claimError.message
            : "無法領取分數。",
        tone: "error",
      });
    } finally {
      setClaiming(false);
    }
  }

  async function handleCheckpointImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setUploadName(file?.name ?? null);
    setUploadDataUrl(null);
    setToast(null);

    if (!file) {
      return;
    }

    try {
      const dataUrl = await readCompressedImageDataUrl(file);
      setUploadDataUrl(dataUrl);
    } catch (imageError) {
      console.error(imageError);
      setUploadName(null);
      setToast({
        message:
          imageError instanceof Error
            ? imageError.message
            : "無法讀取圖片。",
        tone: "error",
      });
    }
  }

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center py-12">
        <p className="text-xl text-slate-600">載入攤位中...</p>
      </main>
    );
  }

  if (notFound || !booth || !studentId) {
    return (
      <StudentPageShell>
        <div className="w-full rounded-3xl border border-sky-100 bg-white p-8 text-center shadow-lg shadow-sky-100/80 sm:p-10">
          <div className="text-6xl">🧭</div>
          <h2 className="mt-4 text-3xl font-bold text-sky-950 sm:text-4xl">
            找不到攤位
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            找不到攤位{" "}
            <span className="font-semibold">{boothId || "未知"}</span>
            。請再次確認 QR 碼，或向助手查詢正確連結。
          </p>
        </div>
      </StudentPageShell>
    );
  }

  return (
    <StudentPageShell refreshScoreKey={scoreRefreshKey}>
      {toast ? (
        <div
          className={`fixed inset-x-4 top-4 z-50 mx-auto max-w-lg rounded-2xl px-6 py-4 text-center text-lg font-semibold text-white shadow-lg ${
            toast.tone === "success" ? "bg-emerald-600" : "bg-red-600"
          }`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      ) : null}

      <div className={venueCardClassName(booth.type)}>
        <VenueHeader venue={booth} />

        <VenueCodeClaim
          venueType={booth.type === "checkpoint" ? "checkpoint" : "booth"}
          claimed={claimed}
          claiming={claiming}
          code={code}
          onCodeChange={handleCodeChange}
          onSubmit={(event) => void handleClaimSubmit(event)}
        />

        {isCheckpointImageMode && checkpointImagePhase && !claimed ? (
          <section className="mt-8 rounded-3xl border border-slate-100 bg-slate-50/70 p-5 sm:p-6">
            <h2 className="text-center text-2xl font-bold text-slate-800">
              上載圖片
            </h2>
            <p className="mt-2 text-center text-base text-slate-600">
              {booth.submissionInstruction?.trim() ||
                "請上載圖片以領取此關卡的分數。"}
            </p>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  選擇圖片
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCheckpointImageChange}
                  disabled={claiming}
                  className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-4 file:py-2 file:font-semibold file:text-emerald-800"
                />
                {uploadName ? (
                  <p className="mt-2 text-sm text-slate-600">已選擇：{uploadName}</p>
                ) : null}
              </label>

              {uploadDataUrl ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
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

              <button
                type="button"
                disabled={claiming || !uploadDataUrl}
                onClick={() => void submitCheckpointImage()}
                className="w-full rounded-3xl bg-emerald-600 px-6 py-5 text-2xl font-bold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {claiming ? "提交中..." : "提交並領取分數"}
              </button>
            </div>
          </section>
        ) : null}

        {booth.type === "booth" && booth.feature ? (
          <FeaturePanel
            venue={booth}
            studentId={studentId}
            getToken={getToken}
          />
        ) : null}
      </div>
    </StudentPageShell>
  );
}

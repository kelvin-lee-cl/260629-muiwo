"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { FeaturePanel } from "@/components/student/FeaturePanel";
import { SlideCarousel } from "@/components/student/SlideCarousel";
import { StudentPageShell } from "@/components/StudentPageShell";
import {
  VenueHeader,
  venueCardClassName,
} from "@/components/student/VenueHeader";
import { useStudent } from "@/contexts/StudentContext";
import { fetchBoothFromFirestore } from "@/lib/boothsClient";
import type { BoothDocument } from "@/lib/booths";

export default function WorkshopPage() {
  return <WorkshopPageContent />;
}

function WorkshopPageContent() {
  const router = useRouter();
  const params = useParams<{ workshopId: string }>();
  const workshopId = params.workshopId?.toUpperCase() ?? "";
  const { authUser, studentId, loading: authLoading, isStudentSession } = useStudent();

  const [workshop, setWorkshop] = useState<BoothDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const isLoggedIn = isStudentSession;

  const getToken = useCallback(async () => {
    if (!authUser) {
      throw new Error("尚未登入。");
    }

    return authUser.getIdToken();
  }, [authUser]);

  useEffect(() => {
    if (authLoading || !isLoggedIn) {
      return;
    }

    if (!workshopId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadWorkshop() {
      setLoading(true);
      setNotFound(false);

      try {
        const data = await fetchBoothFromFirestore(workshopId);

        if (cancelled) {
          return;
        }

        if (!data || data.type !== "workshop") {
          setNotFound(true);
          setWorkshop(null);
          return;
        }

        setWorkshop(data);
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setNotFound(true);
          setWorkshop(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadWorkshop();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isLoggedIn, workshopId]);

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center py-12">
        <p className="text-xl text-slate-600">載入工作坊中...</p>
      </main>
    );
  }

  if (notFound || !workshop || !studentId) {
    return (
      <StudentPageShell>
        <div className="w-full rounded-3xl border border-violet-100 bg-white p-8 text-center shadow-lg shadow-violet-100/80 sm:p-10">
          <div className="text-6xl">🎨</div>
          <h2 className="mt-4 text-3xl font-bold text-violet-950 sm:text-4xl">
            找不到工作坊
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            找不到工作坊{" "}
            <span className="font-semibold">{workshopId || "未知"}</span>
            。請再次確認 QR 碼，或向助手查詢正確連結。
          </p>
        </div>
      </StudentPageShell>
    );
  }

  return (
    <StudentPageShell>
      <div className={venueCardClassName("workshop")}>
        <VenueHeader venue={workshop} showPoints={false} />

        <SlideCarousel slides={workshop.workshopSlides ?? []} />

        {workshop.feature ? (
          <FeaturePanel
            venue={workshop}
            studentId={studentId}
            getToken={getToken}
          />
        ) : null}
      </div>
    </StudentPageShell>
  );
}

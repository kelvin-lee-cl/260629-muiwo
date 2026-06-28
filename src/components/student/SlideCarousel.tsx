"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type SlideCarouselProps = {
  slides: string[];
  title?: string;
  counterLabel?: string;
  className?: string;
};

export function SlideCarousel({
  slides,
  title = "工作坊簡報",
  counterLabel = "第",
  className = "mt-8",
}: SlideCarouselProps) {
  const validSlides = useMemo(
    () => slides.filter((slide) => slide.trim().length > 0),
    [slides],
  );
  const [index, setIndex] = useState(0);

  if (validSlides.length === 0) {
    return null;
  }

  const currentSlide = validSlides[index] ?? validSlides[0];
  const atStart = index === 0;
  const atEnd = index === validSlides.length - 1;

  return (
    <section
      className={`rounded-3xl border border-violet-100 bg-violet-50/60 p-5 sm:p-6 ${className}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-violet-950">{title}</h2>
          <p className="mt-1 text-base text-slate-600">
            {counterLabel} {index + 1} 張／共 {validSlides.length} 張
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setIndex((current) => Math.max(0, current - 1))}
            disabled={atStart}
            className="rounded-xl border border-violet-200 bg-white px-5 py-3 text-base font-semibold text-violet-900 transition hover:bg-violet-100 focus:outline-none focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            上一張
          </button>
          <button
            type="button"
            onClick={() =>
              setIndex((current) =>
                Math.min(validSlides.length - 1, current + 1),
              )
            }
            disabled={atEnd}
            className="rounded-xl bg-violet-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            下一張
          </button>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-violet-100 bg-white">
        <Image
          src={currentSlide}
          alt={`工作坊第 ${index + 1} 張簡報`}
          width={960}
          height={540}
          className="h-auto w-full object-contain"
          priority={index === 0}
        />
      </div>
    </section>
  );
}

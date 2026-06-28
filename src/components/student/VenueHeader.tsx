"use client";

import Image from "next/image";

import {
  studentBoothFeatureLabel,
  studentBoothTypeLabel,
} from "@/lib/studentUi";
import { normalizePosterImageUrl, type BoothDocument } from "@/lib/booths";
import { boothTypeStyles } from "@/lib/boothStyles";

type VenueHeaderProps = {
  venue: BoothDocument;
  showPoints?: boolean;
};

export function VenueHeader({ venue, showPoints = true }: VenueHeaderProps) {
  const styles = boothTypeStyles[venue.type];
  const posterImageUrl = normalizePosterImageUrl(venue.posterImageUrl);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full px-4 py-1.5 text-sm font-semibold uppercase tracking-wide ${styles.badge}`}
        >
          {studentBoothTypeLabel(venue.type)}
        </span>
        <span className="text-sm font-medium text-slate-500">{venue.id}</span>
        {showPoints ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
            {venue.points} 分
          </span>
        ) : null}
        {venue.feature ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
            {studentBoothFeatureLabel(venue.feature)}
          </span>
        ) : null}
      </div>

      <h1
        className={`mt-4 text-3xl font-bold tracking-tight sm:text-4xl ${styles.accentText}`}
      >
        {venue.title}
      </h1>

      {venue.helperName ? (
        <p className="mt-2 text-lg text-slate-600">助手：{venue.helperName}</p>
      ) : null}

      {posterImageUrl ? (
        <div
          className={`mt-6 overflow-hidden rounded-3xl border ${styles.posterFrame}`}
        >
          <Image
            src={posterImageUrl}
            alt={`${venue.title} 海報`}
            width={960}
            height={540}
            className="h-auto w-full object-cover"
            priority
          />
        </div>
      ) : null}

      {venue.description.trim() ? (
        <p className="mt-6 whitespace-pre-wrap text-lg leading-relaxed text-slate-700 sm:text-xl">
          {venue.description}
        </p>
      ) : null}
    </>
  );
}

export function venueCardClassName(type: BoothDocument["type"]): string {
  const styles = boothTypeStyles[type];
  return `w-full rounded-3xl border ${styles.cardBorder} bg-white p-6 shadow-lg ${styles.cardShadow} sm:p-8`;
}

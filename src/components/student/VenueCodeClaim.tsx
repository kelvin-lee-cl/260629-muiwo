"use client";

import type { ChangeEvent, FormEvent } from "react";

import type { BoothType } from "@/lib/booths";
import { boothTypeStyles } from "@/lib/boothStyles";

type VenueCodeClaimProps = {
  venueType: Extract<BoothType, "booth" | "checkpoint">;
  claimed: boolean;
  claiming: boolean;
  code: string;
  onCodeChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function VenueCodeClaim({
  venueType,
  claimed,
  claiming,
  code,
  onCodeChange,
  onSubmit,
}: VenueCodeClaimProps) {
  const styles = boothTypeStyles[venueType];
  const venueLabel = venueType === "checkpoint" ? "關卡" : "攤位";

  return (
    <section className="mt-8 rounded-3xl border border-slate-100 bg-slate-50/70 p-5 sm:p-6">
      <h2 className="text-center text-2xl font-bold text-slate-800">
        {claimed ? "已領取分數" : `輸入${venueLabel}密碼`}
      </h2>
      <p className="mt-2 text-center text-base text-slate-600">
        {claimed
          ? `你已在這個${venueLabel}獲得分數。`
          : `請向此站點的助手索取 3 位數密碼。`}
      </p>

      <form className="mt-6" onSubmit={onSubmit}>
        <input
          type="text"
          inputMode="numeric"
          maxLength={3}
          value={code}
          onChange={onCodeChange}
          placeholder="000"
          aria-label={`${venueLabel}密碼`}
          disabled={claimed || claiming}
          className={`mt-2 w-full rounded-3xl border px-4 py-5 text-center text-5xl font-bold tracking-[0.4em] text-slate-900 outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 sm:text-6xl ${styles.codeInput}`}
        />

        <button
          type="submit"
          disabled={claimed || claiming || code.length !== 3}
          className={`mt-5 w-full rounded-3xl px-6 py-5 text-2xl font-bold text-white transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${styles.accentButton} ${styles.accentButtonHover} ${styles.accentRing}`}
        >
          {claimed
            ? "已領取"
            : claiming
              ? "領取中..."
              : "領取分數"}
        </button>
      </form>
    </section>
  );
}

import type { BoothType } from "@/lib/booths";

type BoothStyle = {
  badge: string;
  pageBackground: string;
  cardBorder: string;
  cardShadow: string;
  accentText: string;
  accentButton: string;
  accentButtonHover: string;
  accentRing: string;
  codeInput: string;
  posterFrame: string;
};

export const boothTypeStyles: Record<BoothType, BoothStyle> = {
  booth: {
    badge: "bg-sky-100 text-sky-800",
    pageBackground: "from-sky-100 via-white to-sky-50",
    cardBorder: "border-sky-100",
    cardShadow: "shadow-sky-100/80",
    accentText: "text-sky-950",
    accentButton: "bg-sky-600",
    accentButtonHover: "hover:bg-sky-700",
    accentRing: "focus:ring-sky-200",
    codeInput: "border-sky-200 bg-sky-50/60 focus:border-sky-400 focus:ring-sky-100",
    posterFrame: "border-sky-100 bg-sky-50/40",
  },
  checkpoint: {
    badge: "bg-emerald-100 text-emerald-800",
    pageBackground: "from-emerald-100 via-white to-lime-50",
    cardBorder: "border-emerald-100",
    cardShadow: "shadow-emerald-100/80",
    accentText: "text-emerald-950",
    accentButton: "bg-emerald-600",
    accentButtonHover: "hover:bg-emerald-700",
    accentRing: "focus:ring-emerald-200",
    codeInput:
      "border-emerald-200 bg-emerald-50/60 focus:border-emerald-400 focus:ring-emerald-100",
    posterFrame: "border-emerald-100 bg-emerald-50/40",
  },
  workshop: {
    badge: "bg-violet-100 text-violet-800",
    pageBackground: "from-violet-100 via-white to-fuchsia-50",
    cardBorder: "border-violet-100",
    cardShadow: "shadow-violet-100/80",
    accentText: "text-violet-950",
    accentButton: "bg-violet-600",
    accentButtonHover: "hover:bg-violet-700",
    accentRing: "focus:ring-violet-200",
    codeInput:
      "border-violet-200 bg-violet-50/60 focus:border-violet-400 focus:ring-violet-100",
    posterFrame: "border-violet-100 bg-violet-50/40",
  },
};

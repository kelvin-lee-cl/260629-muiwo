import type { BoothFeature, BoothType } from "@/lib/booths";

export function studentBoothTypeLabel(type: BoothType): string {
  switch (type) {
    case "booth":
      return "攤位";
    case "checkpoint":
      return "關卡";
    case "workshop":
      return "工作坊";
  }
}

export function studentBoothFeatureLabel(feature: BoothFeature): string {
  switch (feature) {
    case "text-to-image":
      return "文字轉圖像";
    case "text-generator":
      return "文字生成";
    case "image-to-video":
      return "上傳圖片並製作影片";
    case "submission":
      return "作品提交";
  }
}

export function formatPointsLabel(points: number | string): string {
  return `${points} 分`;
}

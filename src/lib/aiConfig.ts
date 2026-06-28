import {
  AI_PROVIDERS,
  AI_SERVICE_ROUTES,
  AI_SERVICE_URL_ENV_KEY,
  type AiFeatureId,
  type AiProviderId,
} from "@shared/aiProviders";

// Must use a static key — Next.js only inlines NEXT_PUBLIC_* at build time for
// literal property access, not process.env[variableName].
const AI_SERVICE_URL =
  process.env.NEXT_PUBLIC_AI_SERVICE_URL?.replace(/\/$/, "");

export { AI_PROVIDERS, AI_SERVICE_ROUTES, AI_SERVICE_URL_ENV_KEY };
export type { AiFeatureId, AiProviderId };

export function getAiServiceUrl(): string {
  if (!AI_SERVICE_URL) {
    throw new Error("AI service is not configured.");
  }

  return AI_SERVICE_URL;
}

export function isAiServiceConfigured(): boolean {
  return Boolean(AI_SERVICE_URL);
}

/** Map booth feature ids to the AI worker route path. */
export function getAiRouteForFeature(feature: AiFeatureId): string {
  switch (feature) {
    case "textToImage":
      return AI_SERVICE_ROUTES.textToImage;
    case "textGeneration":
      return AI_SERVICE_ROUTES.textGeneration;
    case "imageToVideo":
      return AI_SERVICE_ROUTES.imageToVideo;
  }
}

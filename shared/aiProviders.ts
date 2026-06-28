/**
 * Central AI provider configuration.
 *
 * API keys and base URLs are read from environment variables on the Render
 * worker (`server/`). See `server/.env.example` and root `.env.example`.
 *
 * Provider docs:
 * - Recraft (text-to-image): https://www.recraft.ai/
 * - DeepSeek (text generation): https://platform.deepseek.com/
 * - Seedance 2.0 (image-to-video): https://seed.bytedance.com/en/seedance2_0
 */

export type AiProviderId = "recraft" | "deepseek" | "seedance";

export type AiFeatureId = "textToImage" | "textGeneration" | "imageToVideo";

export type AiProviderDefinition = {
  id: AiProviderId;
  name: string;
  feature: AiFeatureId;
  /** Env var for the provider API key (set on Render / in server/.env). */
  apiKeyEnvKey: string;
  /** Optional env var to override the default API base URL. */
  baseUrlEnvKey?: string;
  defaultBaseUrl: string;
  endpoint: string;
  modelEnvKey?: string;
  defaultModel: string;
  docsUrl: string;
  notConfiguredError: string;
};

export const AI_PROVIDERS = {
  recraft: {
    id: "recraft",
    name: "Recraft",
    feature: "textToImage",
    apiKeyEnvKey: "RECRAFT_API_KEY",
    defaultBaseUrl: "https://external.api.recraft.ai",
    endpoint: "/v1/images/generations",
    defaultModel: "recraftv3",
    docsUrl: "https://www.recraft.ai/",
    notConfiguredError:
      "Image generation is not configured yet. Add RECRAFT_API_KEY to server/.env or Render.",
  },
  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    feature: "textGeneration",
    apiKeyEnvKey: "DEEPSEEK_API_KEY",
    defaultBaseUrl: "https://api.deepseek.com",
    endpoint: "/chat/completions",
    defaultModel: "deepseek-chat",
    docsUrl: "https://platform.deepseek.com/",
    notConfiguredError:
      "Text generation is not configured yet. Add DEEPSEEK_API_KEY to server/.env or Render.",
  },
  seedance: {
    id: "seedance",
    name: "Seedance 2.0",
    feature: "imageToVideo",
    apiKeyEnvKey: "SEEDANCE_API_KEY",
    baseUrlEnvKey: "SEEDANCE_API_BASE_URL",
    defaultBaseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    endpoint: "/contents/generations/tasks",
    modelEnvKey: "SEEDANCE_MODEL",
    defaultModel: "doubao-seedance-2-0-260128",
    docsUrl: "https://seed.bytedance.com/en/seedance2_0",
    notConfiguredError:
      "Video generation is not configured yet. Add SEEDANCE_API_KEY (Volcengine Ark API key) to server/.env or Render.",
  },
} as const satisfies Record<AiProviderId, AiProviderDefinition>;

/** Browser-facing AI worker routes (Render Express service). */
export const AI_SERVICE_ROUTES = {
  textToImage: "/api/ai/text-to-image",
  textGeneration: "/api/ai/text-generation",
  imageToVideo: "/api/ai/image-to-video",
} as const;

/** Next.js env var — URL of the Render AI worker. */
export const AI_SERVICE_URL_ENV_KEY = "NEXT_PUBLIC_AI_SERVICE_URL";

/** All server-side AI env keys in one list (for docs / Render dashboard). */
export const AI_SERVER_ENV_KEYS = [
  AI_PROVIDERS.recraft.apiKeyEnvKey,
  AI_PROVIDERS.deepseek.apiKeyEnvKey,
  AI_PROVIDERS.seedance.apiKeyEnvKey,
  AI_PROVIDERS.seedance.baseUrlEnvKey,
  AI_PROVIDERS.seedance.modelEnvKey,
  "FIREBASE_SERVICE_ACCOUNT",
  "CORS_ORIGIN",
] as const;

export function getProviderEndpoint(providerId: AiProviderId): string {
  const provider = AI_PROVIDERS[providerId];
  return `${provider.defaultBaseUrl.replace(/\/$/, "")}${provider.endpoint}`;
}

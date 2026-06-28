import {
  AI_PROVIDERS,
  type AiProviderId,
} from "../../../shared/aiProviders.js";

function readEnv(key: string | undefined): string | undefined {
  if (!key) {
    return undefined;
  }

  const value = process.env[key]?.trim();
  return value || undefined;
}

export function getProviderApiKey(providerId: AiProviderId): string | undefined {
  return readEnv(AI_PROVIDERS[providerId].apiKeyEnvKey);
}

export function getProviderBaseUrl(providerId: AiProviderId): string {
  const provider = AI_PROVIDERS[providerId];
  const override = readEnv(
    "baseUrlEnvKey" in provider ? provider.baseUrlEnvKey : undefined,
  );
  return (override ?? provider.defaultBaseUrl).replace(/\/$/, "");
}

export function getProviderModel(providerId: AiProviderId): string {
  const provider = AI_PROVIDERS[providerId];
  return readEnv(
    "modelEnvKey" in provider ? provider.modelEnvKey : undefined,
  ) ?? provider.defaultModel;
}

export function getProviderApiUrl(providerId: AiProviderId): string {
  const provider = AI_PROVIDERS[providerId];
  return `${getProviderBaseUrl(providerId)}${provider.endpoint}`;
}

export function isProviderConfigured(providerId: AiProviderId): boolean {
  return Boolean(getProviderApiKey(providerId));
}

export function getAiProvidersStatus(): Record<AiProviderId, boolean> {
  return {
    recraft: isProviderConfigured("recraft"),
    deepseek: isProviderConfigured("deepseek"),
    seedance: isProviderConfigured("seedance"),
  };
}

import { isAiServiceConfigured, AI_SERVICE_ROUTES } from "@/lib/aiConfig";

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `Request failed (${response.status}).`;
  } catch {
    return `Request failed (${response.status}).`;
  }
}

async function postAi<T>(
  token: string,
  path: string,
  body: Record<string, string>,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        "無法連接 AI 服務。請確認 AI worker 正在運行（本地：cd server && npm run dev）。",
      );
    }

    throw error;
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as T;
}

export async function generateAiImage(
  token: string,
  params: { prompt: string; userId: string; boothId: string },
): Promise<{ imageUrl: string }> {
  return postAi(token, AI_SERVICE_ROUTES.textToImage, params);
}

export async function generateAiText(
  token: string,
  params: { prompt: string; userId: string; boothId: string },
): Promise<{ generatedText: string }> {
  return postAi(token, AI_SERVICE_ROUTES.textGeneration, params);
}

export async function generateAiVideo(
  token: string,
  params: {
    imageUrl: string;
    prompt: string;
    userId: string;
    boothId: string;
  },
): Promise<{ videoUrl: string }> {
  return postAi(token, AI_SERVICE_ROUTES.imageToVideo, params);
}

export { isAiServiceConfigured };

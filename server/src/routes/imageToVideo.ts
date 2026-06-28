import type { Response } from "express";

import {
  getProviderApiKey,
  getProviderApiUrl,
  getProviderBaseUrl,
  getProviderModel,
  isProviderConfigured,
} from "../config/aiRuntime.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { AI_PROVIDERS } from "../../../shared/aiProviders.js";

type ImageToVideoBody = {
  imageUrl?: unknown;
  prompt?: unknown;
  userId?: unknown;
  boothId?: unknown;
};

type SeedanceTaskResponse = {
  id?: string;
  status?: string;
  content?: {
    video_url?: string;
  };
};

const POLL_TIMEOUT_MS = 180_000;
const INITIAL_POLL_DELAY_MS = 10_000;
const MAX_POLL_DELAY_MS = 60_000;

function parseBody(body: ImageToVideoBody) {
  if (
    typeof body.imageUrl !== "string" ||
    typeof body.prompt !== "string" ||
    typeof body.userId !== "string" ||
    typeof body.boothId !== "string"
  ) {
    return null;
  }

  const imageUrl = body.imageUrl.trim();
  const prompt = body.prompt.trim();
  const userId = body.userId.trim();
  const boothId = body.boothId.trim().toUpperCase();

  if (!imageUrl || !prompt || !userId || !boothId) {
    return null;
  }

  return { imageUrl, prompt, userId, boothId };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function extractVideoUrl(payload: SeedanceTaskResponse): string | undefined {
  return payload.content?.video_url?.trim() || undefined;
}

async function pollSeedanceTask(
  taskId: string,
  apiKey: string,
): Promise<SeedanceTaskResponse> {
  const baseUrl = getProviderBaseUrl("seedance");
  const startedAt = Date.now();
  let delayMs = INITIAL_POLL_DELAY_MS;

  while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
    await sleep(delayMs);
    delayMs = Math.min(delayMs * 2, MAX_POLL_DELAY_MS);

    const response = await fetch(
      `${baseUrl}/contents/generations/tasks/${encodeURIComponent(taskId)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Seedance poll error:", response.status, errorText);
      throw new Error("Video generation status check failed.");
    }

    const payload = (await response.json()) as SeedanceTaskResponse;
    const status = payload.status?.toLowerCase();

    if (status === "succeeded") {
      return payload;
    }

    if (status === "failed" || status === "expired" || status === "cancelled") {
      throw new Error(`Video generation ended with status: ${status}.`);
    }
  }

  throw new Error("Video generation timed out. Try again.");
}

export async function imageToVideoHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const parsed = parseBody(req.body as ImageToVideoBody);

  if (!parsed) {
    res.status(400).json({
      error: "imageUrl, prompt, userId, and boothId are required.",
    });
    return;
  }

  if (!isProviderConfigured("seedance")) {
    res.status(503).json({ error: AI_PROVIDERS.seedance.notConfiguredError });
    return;
  }

  const apiKey = getProviderApiKey("seedance");

  try {
    const createResponse = await fetch(getProviderApiUrl("seedance"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getProviderModel("seedance"),
        content: [
          {
            type: "text",
            text: parsed.prompt,
          },
          {
            type: "image_url",
            image_url: { url: parsed.imageUrl },
          },
        ],
        resolution: "720p",
        ratio: "adaptive",
        duration: 5,
        watermark: false,
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error("Seedance API error:", createResponse.status, errorText);
      res.status(502).json({ error: "Video generation failed. Try again." });
      return;
    }

    const created = (await createResponse.json()) as SeedanceTaskResponse;
    const taskId = created.id?.trim();

    if (!taskId) {
      res.status(502).json({ error: "Video generation returned no task id." });
      return;
    }

    const completed = await pollSeedanceTask(taskId, apiKey!);
    const videoUrl = extractVideoUrl(completed);

    if (!videoUrl) {
      res.status(502).json({ error: "Video generation returned no video." });
      return;
    }

    res.json({ videoUrl });
  } catch (error) {
    console.error(error);
    res.status(502).json({
      error:
        error instanceof Error
          ? error.message
          : "Video generation failed. Try again.",
    });
  }
}

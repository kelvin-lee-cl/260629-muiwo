import type { Response } from "express";

import {
  getProviderApiKey,
  getProviderApiUrl,
  getProviderModel,
  isProviderConfigured,
} from "../config/aiRuntime.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { AI_PROVIDERS } from "../../../shared/aiProviders.js";

type TextToImageBody = {
  prompt?: unknown;
  userId?: unknown;
  boothId?: unknown;
};

function parseBody(body: TextToImageBody) {
  if (
    typeof body.prompt !== "string" ||
    typeof body.userId !== "string" ||
    typeof body.boothId !== "string"
  ) {
    return null;
  }

  const prompt = body.prompt.trim();
  const userId = body.userId.trim();
  const boothId = body.boothId.trim().toUpperCase();

  if (!prompt || !userId || !boothId) {
    return null;
  }

  return { prompt, userId, boothId };
}

export async function textToImageHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const parsed = parseBody(req.body as TextToImageBody);

  if (!parsed) {
    res.status(400).json({ error: "prompt, userId, and boothId are required." });
    return;
  }

  if (!isProviderConfigured("recraft")) {
    res.status(503).json({ error: AI_PROVIDERS.recraft.notConfiguredError });
    return;
  }

  const apiKey = getProviderApiKey("recraft");

  try {
    const response = await fetch(getProviderApiUrl("recraft"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: parsed.prompt,
        model: getProviderModel("recraft"),
        response_format: "url",
        style: "Illustration",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Recraft API error:", response.status, errorText);
      res.status(502).json({ error: "Image generation failed. Try again." });
      return;
    }

    const payload = (await response.json()) as {
      data?: Array<{ url?: string }>;
    };
    const imageUrl = payload.data?.[0]?.url;

    if (!imageUrl) {
      res.status(502).json({ error: "Image generation returned no image." });
      return;
    }

    res.json({ imageUrl });
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: "Image generation failed. Try again." });
  }
}

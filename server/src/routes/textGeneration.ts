import type { Response } from "express";

import {
  getProviderApiKey,
  getProviderApiUrl,
  getProviderModel,
  isProviderConfigured,
} from "../config/aiRuntime.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { AI_PROVIDERS } from "../../../shared/aiProviders.js";

type TextGenerationBody = {
  prompt?: unknown;
  userId?: unknown;
  boothId?: unknown;
};

function parseBody(body: TextGenerationBody) {
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

export async function textGenerationHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const parsed = parseBody(req.body as TextGenerationBody);

  if (!parsed) {
    res.status(400).json({ error: "prompt, userId, and boothId are required." });
    return;
  }

  if (!isProviderConfigured("deepseek")) {
    res.status(503).json({ error: AI_PROVIDERS.deepseek.notConfiguredError });
    return;
  }

  const apiKey = getProviderApiKey("deepseek");

  try {
    const response = await fetch(getProviderApiUrl("deepseek"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getProviderModel("deepseek"),
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You are a friendly STEM workshop assistant for primary school students. Write short, cheerful, age-appropriate responses in plain English.",
          },
          {
            role: "user",
            content: parsed.prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DeepSeek API error:", response.status, errorText);
      res.status(502).json({ error: "Text generation failed. Try again." });
      return;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const generatedText = payload.choices?.[0]?.message?.content?.trim();

    if (!generatedText) {
      res.status(502).json({ error: "Text generation returned no content." });
      return;
    }

    res.json({ generatedText });
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: "Text generation failed. Try again." });
  }
}

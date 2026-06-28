import { NextResponse } from "next/server";

export function getUpstreamAiServiceUrl(): string | null {
  const url =
    process.env.AI_SERVICE_URL?.trim() ||
    process.env.NEXT_PUBLIC_AI_SERVICE_URL?.trim();

  return url ? url.replace(/\/$/, "") : null;
}

export async function proxyAiRequest(
  request: Request,
  path: string,
): Promise<NextResponse> {
  const baseUrl = getUpstreamAiServiceUrl();

  if (!baseUrl) {
    return NextResponse.json(
      { error: "AI service is not configured." },
      { status: 503 },
    );
  }

  const authorization = request.headers.get("authorization");
  const body = await request.text();

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body,
    });

    const responseBody = await response.text();

    if (response.status === 404) {
      return NextResponse.json(
        {
          error:
            "AI worker is not running. Start it locally (cd server && npm run dev) or deploy schoolquest-ai on Render.",
        },
        { status: 502 },
      );
    }

    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error("AI proxy request failed:", error);
    return NextResponse.json(
      {
        error:
          "Could not reach the AI service. Check that the Render worker is running and AI_SERVICE_URL is set.",
      },
      { status: 502 },
    );
  }
}

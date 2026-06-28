import { proxyAiRequest } from "@/lib/aiProxy";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { path } = await context.params;
  return proxyAiRequest(request, `/api/ai/${path.join("/")}`);
}

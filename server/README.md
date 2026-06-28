# Recraft proxy worker (Render)

Node.js Express service deployed to Render. The Next.js app calls it directly from the browser for AI generation. Student submissions still save through the Vercel `/api/student/works` route into the `studentWorks` collection.

**Central config:** `shared/aiProviders.ts` — provider URLs, models, and env var names.

## Endpoints

| Method | Path | Provider | Purpose |
| ------ | ---- | -------- | ------- |
| GET | `/health` | — | Health check |
| POST | `/api/ai/text-to-image` | Recraft | Generate an image from a prompt |
| POST | `/api/ai/text-generation` | DeepSeek | Generate text from a prompt |
| POST | `/api/ai/image-to-video` | Seedance 2.0 | Animate an image into video |

All AI routes require `Authorization: Bearer <Firebase ID token>` and share a token-bucket rate limiter (5 req/s, burst 10).

## Environment variables

Copy `server/.env.example` to `server/.env` for local development.

| Variable | Required | Provider | Description |
| -------- | -------- | -------- | ----------- |
| `RECRAFT_API_KEY` | Yes* | [Recraft](https://www.recraft.ai/) | Text-to-image API key |
| `DEEPSEEK_API_KEY` | Yes* | [DeepSeek](https://platform.deepseek.com/) | Text generation API key |
| `SEEDANCE_API_KEY` | Yes* | [Seedance 2.0](https://seed.bytedance.com/en/seedance2_0) | Volcengine Ark API key for image-to-video |
| `SEEDANCE_API_BASE_URL` | No | Seedance | Default: `https://ark.cn-beijing.volces.com/api/v3` |
| `SEEDANCE_MODEL` | No | Seedance | Default: `doubao-seedance-2-0-260128` |
| `FIREBASE_SERVICE_ACCOUNT` | Yes | Firebase | Service account JSON as a single-line string |
| `CORS_ORIGIN` | Yes | — | Vercel app URL, e.g. `https://your-app.vercel.app` |
| `PORT` | No | — | Render sets this automatically |

\*Required for the corresponding booth feature to work.

On **Vercel**, set only:

```
NEXT_PUBLIC_AI_SERVICE_URL=https://your-render-service.onrender.com
```

## Local development

```bash
cd server
cp .env.example .env   # add your API keys
npm install
npm run dev
```

Set `NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:10000` in the Next.js `.env.local`.

## Deploy on Render

1. Create a **Web Service** pointing at the `server/` directory (or use `render.yaml`).
2. Add the environment variables above in the Render dashboard.
3. Set `NEXT_PUBLIC_AI_SERVICE_URL` on Vercel to the Render service URL.

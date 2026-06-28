import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { getAiProvidersStatus } from "./config/aiRuntime.js";
import { requireStudentAuth } from "./middleware/auth.js";
import { imageToVideoHandler } from "./routes/imageToVideo.js";
import { textGenerationHandler } from "./routes/textGeneration.js";
import { textToImageHandler } from "./routes/textToImage.js";
import { rateLimitMiddleware } from "./utils/rateLimiter.js";

dotenv.config({
  path: join(dirname(fileURLToPath(import.meta.url)), "../.env"),
});

const app = express();
const port = Number(process.env.PORT ?? 10000);
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3000";

app.use(
  cors({
    origin: corsOrigin,
    methods: ["GET", "POST", "OPTIONS"],
  }),
);
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const aiRouter = express.Router();
aiRouter.use(rateLimitMiddleware);
aiRouter.use((req, res, next) => {
  void requireStudentAuth(req, res, next);
});

aiRouter.post("/text-to-image", (req, res) => {
  void textToImageHandler(req, res);
});
aiRouter.post("/text-generation", (req, res) => {
  void textGenerationHandler(req, res);
});
aiRouter.post("/image-to-video", (req, res) => {
  void imageToVideoHandler(req, res);
});

app.use("/api/ai", aiRouter);

app.use(
  (
    error: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(error);
    res.status(500).json({ error: "Unexpected server error." });
  },
);

app.listen(port, () => {
  const providers = getAiProvidersStatus();
  console.log(`AI service listening on port ${port}`);
  console.log(
    `Configured: recraft=${providers.recraft}, deepseek=${providers.deepseek}, seedance=${providers.seedance}, firebase=${Boolean(process.env.FIREBASE_SERVICE_ACCOUNT)}`,
  );
});

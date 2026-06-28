import type { NextFunction, Request, Response } from "express";

import { verifyBearerToken } from "../utils/firebaseAdmin.js";

export type AuthenticatedRequest = Request & {
  authUid?: string;
};

export async function requireStudentAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    res.status(503).json({
      error:
        "AI service auth is not configured. Add FIREBASE_SERVICE_ACCOUNT to server/.env.",
    });
    return;
  }

  try {
    req.authUid = await verifyBearerToken(req.headers.authorization);
    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: "Unauthorized." });
  }
}

import type { NextFunction, Request, Response } from "express";
import { API_MESSAGES } from "../constants/api-messages.js";
import { verifyAppToken } from "../services/auth.service.js";
import { AppError } from "../utils/app-error.js";

const extractBearerToken = (headerValue: string | undefined): string | null => {
  if (!headerValue) {
    return null;
  }

  const [scheme, token] = headerValue.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token.trim();
};

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    throw new AppError(401, "AUTH_MISSING_TOKEN", API_MESSAGES.errors.authMissingToken);
  }

  const decoded = verifyAppToken(token);
  req.auth = decoded;
  next();
};

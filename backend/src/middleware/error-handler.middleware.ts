import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../config/logger.js";
import { API_MESSAGES } from "../constants/api-messages.js";
import { AppError } from "../utils/app-error.js";
import { sendError } from "../utils/http-response.js";

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof ZodError) {
    sendError(res, 400, API_MESSAGES.errors.validationFailed, "VALIDATION_ERROR", err.flatten());
    return;
  }

  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.message, err.code, err.details);
    return;
  }

  if (err instanceof SyntaxError && "body" in err) {
    sendError(res, 400, API_MESSAGES.errors.invalidJson, "INVALID_JSON");
    return;
  }

  logger.error("Unhandled error", err);
  sendError(res, 500, API_MESSAGES.errors.internalServerError, "INTERNAL_SERVER_ERROR");
};

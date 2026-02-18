import type { Response } from "express";
import type { ApiResponse } from "../types/api-response.types.js";

const buildMeta = (res: Response) => ({
  requestId: (res.getHeader("X-Request-Id") as string | undefined) ?? undefined,
  timestamp: new Date().toISOString()
});

export const sendSuccess = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data: T
): Response<ApiResponse<T>> => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    error: null,
    meta: buildMeta(res)
  });
};

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  code: string,
  details?: unknown
): Response<ApiResponse<null>> => {
  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
    error: {
      code,
      details
    },
    meta: buildMeta(res)
  });
};

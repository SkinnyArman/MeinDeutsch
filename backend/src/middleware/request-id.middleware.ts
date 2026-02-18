import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const id = crypto.randomUUID();
  res.setHeader("X-Request-Id", id);
  req.headers["x-request-id"] = id;
  next();
};

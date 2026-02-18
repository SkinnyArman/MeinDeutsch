import type { Request, Response } from "express";
import { API_MESSAGES } from "../constants/api-messages.js";
import { sendError } from "../utils/http-response.js";

export const notFoundHandler = (_req: Request, res: Response): void => {
  sendError(res, 404, API_MESSAGES.errors.routeNotFound, "ROUTE_NOT_FOUND");
};

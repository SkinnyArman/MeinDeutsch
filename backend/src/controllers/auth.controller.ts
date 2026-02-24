import type { Request, Response } from "express";
import { z } from "zod";
import { API_MESSAGES } from "../constants/api-messages.js";
import { authService } from "../services/auth.service.js";
import { sendSuccess } from "../utils/http-response.js";

const googleSignInSchema = z.object({
  idToken: z.string().min(1)
});

export const googleSignInController = async (req: Request, res: Response): Promise<void> => {
  const payload = googleSignInSchema.parse(req.body);
  const session = await authService.signInWithGoogle(payload.idToken);
  sendSuccess(res, 200, API_MESSAGES.auth.signedIn, session);
};

export const authMeController = async (req: Request, res: Response): Promise<void> => {
  const user = await authService.getSessionUser(req.auth.userId);
  sendSuccess(res, 200, API_MESSAGES.auth.sessionFetched, user);
};

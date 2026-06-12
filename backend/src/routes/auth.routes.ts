import { Router } from "express";
import { googleSignInController, passwordSignInController } from "../controllers/auth.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

export const authRouter = Router();

authRouter.post("/google", asyncHandler(googleSignInController));
authRouter.post("/password", asyncHandler(passwordSignInController));

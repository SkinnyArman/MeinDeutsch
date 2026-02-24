import { Router } from "express";
import { googleSignInController } from "../controllers/auth.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

export const authRouter = Router();

authRouter.post("/google", asyncHandler(googleSignInController));

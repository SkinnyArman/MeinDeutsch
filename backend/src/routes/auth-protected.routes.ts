import { Router } from "express";
import { authMeController } from "../controllers/auth.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

export const authProtectedRouter = Router();

authProtectedRouter.get("/me", asyncHandler(authMeController));

import type { Request, Response } from "express";
import { z } from "zod";
import { API_MESSAGES } from "../constants/api-messages.js";
import { submissionService } from "../services/submission.service.js";
import { sendSuccess } from "../utils/http-response.js";

const schema = z.object({
  prompt: z.string().min(1),
  answerText: z.string().min(1)
});

export const submitTextController = async (req: Request, res: Response): Promise<void> => {
  const payload = schema.parse(req.body);
  const result = await submissionService.processTextSubmission(payload);
  sendSuccess(res, 201, API_MESSAGES.submission.created, result);
};

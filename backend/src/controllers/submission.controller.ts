import type { Request, Response } from "express";
import { z } from "zod";
import { API_MESSAGES } from "../constants/api-messages.js";
import { submissionService } from "../services/submission.service.js";
import { submissionRepository } from "../repositories/submission.repository.js";
import { sendSuccess } from "../utils/http-response.js";
import { AppError } from "../utils/app-error.js";

const schema = z.object({
  questionId: z.coerce.number().int().positive(),
  answerText: z.string().min(1)
});

export const submitTextController = async (req: Request, res: Response): Promise<void> => {
  const payload = schema.parse(req.body);
  const result = await submissionService.processTextSubmission(payload, req.auth.userId);
  sendSuccess(res, 201, API_MESSAGES.submission.created, result);
};

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(30),
  offset: z.coerce.number().int().min(0).default(0)
});

export const listSubmissionsController = async (req: Request, res: Response): Promise<void> => {
  const query = listSchema.parse(req.query);
  const [items, total] = await Promise.all([
    submissionRepository.listAnswerLogs({ userId: req.auth.userId, limit: query.limit, offset: query.offset }),
    submissionRepository.countAnswerLogs(req.auth.userId)
  ]);
  const limit = query.limit;
  const offset = query.offset;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.floor(offset / limit) + 1;
  sendSuccess(res, 200, API_MESSAGES.submission.listed, {
    items,
    total,
    limit,
    offset,
    page,
    totalPages,
    hasMore: offset + items.length < total
  });
};

const paramSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const getSubmissionController = async (req: Request, res: Response): Promise<void> => {
  const params = paramSchema.parse(req.params);
  const log = await submissionRepository.findAnswerLogById(params.id, req.auth.userId);
  if (!log) {
    throw new AppError(404, "SUBMISSION_NOT_FOUND", API_MESSAGES.errors.submissionNotFound);
  }
  sendSuccess(res, 200, API_MESSAGES.submission.fetched, log);
};

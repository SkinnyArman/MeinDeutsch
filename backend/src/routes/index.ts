import { Router } from "express";
import { authProtectedRouter } from "./auth-protected.routes.js";
import { authRouter } from "./auth.routes.js";
import { collocationRouter } from "./collocation.routes.js";
import { conversationRouter } from "./conversation.routes.js";
import { dashboardRouter } from "./dashboard.routes.js";
import { expressionRouter } from "./expression.routes.js";
import { levelRouter } from "./level.routes.js";
import { progressRouter } from "./progress.routes.js";
import { healthRouter } from "./health.routes.js";
import { knowledgeRouter } from "./knowledge.routes.js";
import { questionRouter } from "./question.routes.js";
import { streakRouter } from "./streak.routes.js";
import { submissionRouter } from "./submission.routes.js";
import { topicRouter } from "./topic.routes.js";
import { vocabularyRouter } from "./vocabulary.routes.js";

export const publicApiRouter = Router();
export const protectedApiRouter = Router();

publicApiRouter.use(healthRouter);
publicApiRouter.use("/auth", authRouter);

protectedApiRouter.use("/topics", topicRouter);
protectedApiRouter.use("/auth", authProtectedRouter);
protectedApiRouter.use("/collocations", collocationRouter);
protectedApiRouter.use("/conversations", conversationRouter);
protectedApiRouter.use("/dashboard", dashboardRouter);
protectedApiRouter.use("/level", levelRouter);
protectedApiRouter.use("/progress", progressRouter);
protectedApiRouter.use("/expressions", expressionRouter);
protectedApiRouter.use("/questions", questionRouter);
protectedApiRouter.use("/knowledge", knowledgeRouter);
protectedApiRouter.use("/streaks", streakRouter);
protectedApiRouter.use("/submissions", submissionRouter);
protectedApiRouter.use("/vocabulary", vocabularyRouter);

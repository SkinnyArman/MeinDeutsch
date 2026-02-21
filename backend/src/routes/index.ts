import { Router } from "express";
import { healthRouter } from "./health.routes.js";
import { knowledgeRouter } from "./knowledge.routes.js";
import { questionRouter } from "./question.routes.js";
import { streakRouter } from "./streak.routes.js";
import { submissionRouter } from "./submission.routes.js";
import { topicRouter } from "./topic.routes.js";
import { vocabularyRouter } from "./vocabulary.routes.js";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use("/topics", topicRouter);
apiRouter.use("/questions", questionRouter);
apiRouter.use("/knowledge", knowledgeRouter);
apiRouter.use("/streaks", streakRouter);
apiRouter.use("/submissions", submissionRouter);
apiRouter.use("/vocabulary", vocabularyRouter);

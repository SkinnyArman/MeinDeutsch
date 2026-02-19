import { Router } from "express";
import { healthRouter } from "./health.routes.js";
import { questionRouter } from "./question.routes.js";
import { submissionRouter } from "./submission.routes.js";
import { topicRouter } from "./topic.routes.js";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use("/topics", topicRouter);
apiRouter.use("/questions", questionRouter);
apiRouter.use("/submissions", submissionRouter);

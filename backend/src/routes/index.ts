import { Router } from "express";
import { healthRouter } from "./health.routes.js";
import { submissionRouter } from "./submission.routes.js";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use("/submissions", submissionRouter);

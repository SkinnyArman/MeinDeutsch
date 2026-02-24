import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { requireAuth } from "./middleware/auth.middleware.js";
import { protectedApiRouter, publicApiRouter } from "./routes/index.js";
import { errorHandler } from "./middleware/error-handler.middleware.js";
import { notFoundHandler } from "./middleware/not-found.middleware.js";
import { requestId } from "./middleware/request-id.middleware.js";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestId);
app.use(morgan("dev"));

app.use("/api", publicApiRouter);
app.use("/api", requireAuth, protectedApiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

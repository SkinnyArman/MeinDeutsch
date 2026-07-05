import cors from "cors";
import type { CorsOptions } from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { requireAuth } from "./middleware/auth.middleware.js";
import { protectedApiRouter, publicApiRouter } from "./routes/index.js";
import { errorHandler } from "./middleware/error-handler.middleware.js";
import { notFoundHandler } from "./middleware/not-found.middleware.js";
import { requestId } from "./middleware/request-id.middleware.js";

export const app = express();

const allowedOrigins = env.ALLOWED_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [];
const corsOptions: CorsOptions = allowedOrigins.length
  ? {
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("Not allowed by CORS"));
      }
    }
  : {};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(requestId);
app.use(morgan("dev"));

app.use("/api", publicApiRouter);
app.use("/api", requireAuth, protectedApiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

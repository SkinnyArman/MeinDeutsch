import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import type { UserRecord } from "../models/user.model.js";
import { userRepository } from "../repositories/user.repository.js";
import { topicService } from "./topic.service.js";
import { AppError } from "../utils/app-error.js";
import { API_MESSAGES } from "../constants/api-messages.js";

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

const parseWhitelist = (): Set<string> => {
  const emails = env.GOOGLE_AUTHORIZED_EMAILS.split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return new Set(emails);
};

const allowedEmails = parseWhitelist();

const signToken = (user: UserRecord): string =>
  jwt.sign(
    {
      sub: String(user.id),
      email: user.email
    },
    env.APP_JWT_SECRET,
    { expiresIn: "7d", issuer: "meindeutsch-backend", audience: "meindeutsch-frontend" }
  );

export const isGoogleUpstreamFailure = (error: unknown): boolean => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybe = error as {
    code?: unknown;
    response?: { status?: unknown; config?: { url?: unknown } };
    config?: { url?: unknown };
    message?: unknown;
  };

  const status = maybe.response?.status;
  const url = typeof maybe.response?.config?.url === "string"
    ? maybe.response?.config?.url
    : (typeof maybe.config?.url === "string" ? maybe.config.url : "");
  const message = typeof maybe.message === "string" ? maybe.message.toLowerCase() : "";

  return (
    status === 403 ||
    url.includes("googleapis.com/oauth2/v1/certs") ||
    message.includes("getaddrinfo") ||
    message.includes("econnreset") ||
    message.includes("etimedout")
  );
};

export const authService = {
  async signInWithGoogle(idToken: string): Promise<{ token: string; user: UserRecord }> {
    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID
      });
    } catch (error) {
      if (isGoogleUpstreamFailure(error)) {
        throw new AppError(503, "AUTH_GOOGLE_UPSTREAM_UNAVAILABLE", API_MESSAGES.errors.authGoogleUpstreamUnavailable);
      }
      throw new AppError(401, "AUTH_INVALID_GOOGLE_TOKEN", API_MESSAGES.errors.authInvalidGoogleToken);
    }
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email || !payload.email_verified) {
      throw new AppError(401, "AUTH_INVALID_GOOGLE_TOKEN", API_MESSAGES.errors.authInvalidGoogleToken);
    }

    const email = payload.email.toLowerCase();
    if (!allowedEmails.has(email)) {
      throw new AppError(403, "AUTH_EMAIL_NOT_ALLOWED", API_MESSAGES.errors.authEmailNotAllowed);
    }

    let user = await userRepository.findByGoogleSub(payload.sub);
    if (!user) {
      user = await userRepository.create({
        googleSub: payload.sub,
        email,
        displayName: payload.name ?? null,
        avatarUrl: payload.picture ?? null
      });
      try {
        await topicService.seedDefaultTopics(user.id);
      } catch (error) {
        // A failed seed should not block sign-in; topics can be added manually.
        logger.error("Failed to seed default topics for new user", error);
      }
    }

    return {
      token: signToken(user),
      user
    };
  },

  async getSessionUser(userId: number): Promise<UserRecord> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError(401, "AUTH_INVALID_SESSION", API_MESSAGES.errors.authInvalidSession);
    }
    return user;
  }
};

export const verifyAppToken = (token: string): { userId: number; email: string } => {
  const decoded = jwt.verify(token, env.APP_JWT_SECRET, {
    issuer: "meindeutsch-backend",
    audience: "meindeutsch-frontend"
  }) as jwt.JwtPayload;

  const sub = decoded.sub;
  const email = decoded.email;
  const userId = typeof sub === "string" ? Number(sub) : NaN;

  if (!Number.isInteger(userId) || userId <= 0 || typeof email !== "string" || !email) {
    throw new AppError(401, "AUTH_INVALID_SESSION", API_MESSAGES.errors.authInvalidSession);
  }

  return { userId, email };
};

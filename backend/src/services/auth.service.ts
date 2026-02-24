import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { UserRecord } from "../models/user.model.js";
import { userRepository } from "../repositories/user.repository.js";
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

export const authService = {
  async signInWithGoogle(idToken: string): Promise<{ token: string; user: UserRecord }> {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID
    });
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

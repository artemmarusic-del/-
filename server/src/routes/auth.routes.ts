import crypto from "crypto";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../db";
import { env } from "../env";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { HttpError } from "../middleware/errorHandler";
import { comparePassword, hashPassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import { sendPasswordResetEmail } from "../services/emailService";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Слишком много попыток. Повторите позже." },
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Пароль должен содержать не менее 8 символов"),
  name: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function setAuthCookie(res: import("express").Response, token: string) {
  res.cookie("token", token, {
    httpOnly: true,
    // Frontend and API are served from the same origin in production, so
    // SameSite=Lax is enough (and safer than None). Secure only in prod.
    secure: env.isProduction,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

router.post(
  "/register",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password, name } = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new HttpError(409, "Пользователь с таким email уже зарегистрирован");
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash, name },
    });

    const token = signToken({ userId: user.id });
    setAuthCookie(res, token);
    res.status(201).json({ id: user.id, email: user.email, name: user.name });
  })
);

router.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new HttpError(401, "Неверный email или пароль");
    }
    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      throw new HttpError(401, "Неверный email или пароль");
    }

    const token = signToken({ userId: user.id });
    setAuthCookie(res, token);
    res.json({ id: user.id, email: user.email, name: user.name });
  })
);

const forgotSchema = z.object({ email: z.string().email() });

router.post(
  "/forgot-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email } = forgotSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });

    // Always respond the same way, whether or not the email exists, to avoid
    // revealing which emails are registered (user enumeration).
    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: hashToken(rawToken), expiresAt },
      });
      const resetUrl = `${env.appUrl}/reset-password?token=${rawToken}`;
      try {
        await sendPasswordResetEmail(user.email, resetUrl);
      } catch (err) {
        console.error("[email] Не удалось отправить письмо сброса:", err);
      }
    }

    res.json({
      message:
        "Если аккаунт с таким email существует, на него отправлено письмо со ссылкой для сброса пароля.",
    });
  })
);

const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, "Пароль должен содержать не менее 8 символов"),
});

router.post(
  "/reset-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { token, password } = resetSchema.parse(req.body);
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new HttpError(400, "Ссылка недействительна или устарела. Запросите сброс пароля заново.");
    }

    const passwordHash = await hashPassword(password);
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Invalidate any other outstanding reset tokens for this user.
      prisma.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);

    res.json({ message: "Пароль изменён. Теперь войдите с новым паролем." });
  })
);

router.post("/logout", (_req, res) => {
  // clearCookie must use the same attributes the cookie was set with.
  res.clearCookie("token", {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
  });
  res.status(204).send();
});

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { profile: true },
    });
    if (!user) {
      throw new HttpError(404, "Пользователь не найден");
    }
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      hasProfile: !!user.profile,
    });
  })
);

export default router;

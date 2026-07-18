import { NextFunction, Request, Response } from "express";
import { prisma } from "../db";
import { HttpError } from "./errorHandler";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      profileId?: string;
    }
  }
}

/**
 * Resolves which tracked person (profile) the request applies to.
 *
 * The client sends the chosen profile in the `X-Profile-Id` header; we verify
 * it actually belongs to the authenticated account, so one user can never read
 * or write another account's data. Without the header we fall back to the
 * account's first profile.
 */
export async function resolveProfile(req: Request, _res: Response, next: NextFunction) {
  try {
    const requested = req.header("X-Profile-Id");

    if (requested) {
      const profile = await prisma.profile.findFirst({
        where: { id: requested, userId: req.userId },
        select: { id: true },
      });
      if (!profile) {
        throw new HttpError(403, "Профиль не найден или принадлежит другому аккаунту");
      }
      req.profileId = profile.id;
      return next();
    }

    const first = await prisma.profile.findFirst({
      where: { userId: req.userId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!first) {
      throw new HttpError(404, "Сначала создайте профиль");
    }
    req.profileId = first.id;
    next();
  } catch (err) {
    next(err);
  }
}

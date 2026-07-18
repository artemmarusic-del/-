import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt";
import { HttpError } from "./errorHandler";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.token as string | undefined;
  if (!token) {
    throw new HttpError(401, "Требуется авторизация");
  }
  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    next();
  } catch {
    throw new HttpError(401, "Сессия недействительна, войдите снова");
  }
}

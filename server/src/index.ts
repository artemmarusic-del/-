import path from "path";
import fs from "fs";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { env } from "./env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

import authRoutes from "./routes/auth.routes";
import profileRoutes from "./routes/profile.routes";
import foodsRoutes from "./routes/foods.routes";
import diaryRoutes from "./routes/diary.routes";
import insulinRoutes from "./routes/insulin.routes";
import adaptationRoutes from "./routes/adaptation.routes";
import statsRoutes from "./routes/stats.routes";

const app = express();

app.set("trust proxy", 1);
app.use(
  helmet({
    // We serve our own SPA from the same origin; relax CSP so the built
    // assets (inline styles from Vite, etc.) load without extra config.
    contentSecurityPolicy: false,
  })
);
app.use(
  cors({
    // Фронтенд отдаётся с этого же адреса, поэтому CORS нужен только для
    // dev-сервера. В production разрешаем собственный публичный адрес.
    origin: env.isProduction ? env.appUrl : env.clientUrl,
    credentials: true,
  })
);

// Манифест, иконки, service worker и файлы для скачивания — публичные ресурсы.
// Разрешаем читать их с других источников, иначе внешние проверяющие сервисы
// (например, генератор APK) не видят манифест и считают сайт не-PWA.
const PUBLIC_ASSETS = /^\/(manifest\.webmanifest|sw\.js|favicon|icons\/|files\/)/;
app.use((req, res, next) => {
  if (PUBLIC_ASSETS.test(req.path)) {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.removeHeader("Access-Control-Allow-Credentials");
  }
  next();
});
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/foods", foodsRoutes);
app.use("/api/diary", diaryRoutes);
app.use("/api/insulin", insulinRoutes);
app.use("/api/adaptation", adaptationRoutes);
app.use("/api/stats", statsRoutes);

// Serve the built React app from the same origin (single-service deploy).
// When client/dist exists, any non-/api route returns index.html so that
// client-side routing (React Router) works on refresh/deep links.
const clientDist = process.env.CLIENT_DIST_PATH
  ? path.resolve(process.env.CLIENT_DIST_PATH)
  : path.resolve(__dirname, "../../client/dist");

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
  console.log(`Serving frontend from ${clientDist}`);
} else {
  console.log("Frontend build not found — running in API-only mode.");
}

// 404 handler for unmatched /api routes.
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`API server listening on port ${env.port}`);
});

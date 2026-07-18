import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  port: Number(process.env.PORT ?? 4000),
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  isProduction: process.env.NODE_ENV === "production",

  // Public base URL used to build links inside emails (password reset, etc.).
  appUrl: process.env.APP_URL ?? "https://xe-dnevnik.onrender.com",

  // SMTP settings for outgoing mail. If SMTP_HOST is empty, the app falls back
  // to logging the reset link to the server console instead of sending mail.
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "no-reply@xe-dnevnik",
  },
};

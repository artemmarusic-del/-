import nodemailer from "nodemailer";
import { env } from "../env";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!env.smtp.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465, // implicit TLS on 465, STARTTLS otherwise
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }
  return transporter;
}

/**
 * Sends the password-reset email. If SMTP is not configured, logs the reset
 * link to the server console instead (so the feature is testable before the
 * mail provider is set up) and returns false.
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  const tx = getTransporter();
  if (!tx) {
    console.log(
      `[email] SMTP не настроен. Ссылка для сброса пароля для ${to}:\n${resetUrl}`
    );
    return false;
  }

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1f2937">
      <h2 style="color:#1e7d64">ХЕ.Дневник — сброс пароля</h2>
      <p>Вы (или кто-то другой) запросили сброс пароля для вашей учётной записи.</p>
      <p>Чтобы задать новый пароль, нажмите на кнопку ниже. Ссылка действительна 1 час.</p>
      <p style="margin:24px 0">
        <a href="${resetUrl}"
           style="background:#1e7d64;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">
          Задать новый пароль
        </a>
      </p>
      <p style="font-size:13px;color:#6b7280">
        Если кнопка не работает, скопируйте ссылку в браузер:<br>
        <a href="${resetUrl}">${resetUrl}</a>
      </p>
      <p style="font-size:13px;color:#6b7280">
        Если вы не запрашивали сброс пароля — просто проигнорируйте это письмо, ваш пароль останется прежним.
      </p>
    </div>
  `;

  await tx.sendMail({
    from: env.smtp.from,
    to,
    subject: "Сброс пароля — ХЕ.Дневник",
    html,
    text:
      `Сброс пароля для ХЕ.Дневник.\n\n` +
      `Чтобы задать новый пароль, перейдите по ссылке (действительна 1 час):\n${resetUrl}\n\n` +
      `Если вы не запрашивали сброс — проигнорируйте это письмо.`,
  });
  return true;
}

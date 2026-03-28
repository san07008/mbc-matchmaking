import nodemailer from "nodemailer";
import { logger } from "./logger";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

let transporter: nodemailer.Transporter | null = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  logger.info("Email transport configured via SMTP");
} else {
  logger.warn("SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS to enable email sending.");
}

export function isEmailConfigured(): boolean {
  return transporter !== null;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  attachments?: Array<{ filename: string; content: string; contentType: string }>
): Promise<{ success: boolean; error?: string }> {
  if (!transporter) {
    return { success: false, error: "Email service not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables." };
  }
  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      html,
      attachments,
    });
    logger.info({ to, subject }, "Email sent successfully");
    return { success: true };
  } catch (err: any) {
    logger.error({ to, subject, error: err.message }, "Failed to send email");
    return { success: false, error: err.message };
  }
}

export function buildInviteEmail(params: {
  recipientEmail: string;
  role: string;
  cohortName?: string | null;
  inviteLink: string;
}): { subject: string; html: string } {
  const { role, cohortName, inviteLink } = params;
  const roleLabel = role === "admin" ? "an Administrator" : "a Preceptor";
  const cohortLine = cohortName ? ` for <strong>${cohortName}</strong>` : "";

  const subject = `You're invited to MBC Matchmaking${cohortName ? ` — ${cohortName}` : ""}`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#065f46,#1e293b);padding:32px;text-align:center;">
      <h1 style="color:#fff;font-size:24px;margin:0 0 8px;">MBC Matchmaking Platform</h1>
      <p style="color:#94a3b8;margin:0;font-size:14px;">Master of Business Creation</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#e2e8f0;font-size:16px;line-height:1.6;margin:0 0 16px;">
        You've been invited to join the MBC Matchmaking Platform as <strong style="color:#34d399;">${roleLabel}</strong>${cohortLine}.
      </p>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Click the button below to create your account and get started.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${inviteLink}" style="display:inline-block;background:#059669;color:#fff;font-weight:700;font-size:16px;padding:14px 32px;border-radius:8px;text-decoration:none;">
          Create Your Account
        </a>
      </div>
      <p style="color:#64748b;font-size:12px;margin:24px 0 0;line-height:1.5;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${inviteLink}" style="color:#818cf8;word-break:break-all;">${inviteLink}</a>
      </p>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #334155;text-align:center;">
      <p style="color:#475569;font-size:11px;margin:0;">This is a one-time invite link. It can only be used once.</p>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]|\.\d{3}/g, "");
}

export function buildICSContent(params: {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location?: string;
}): string {
  const { title, description, startTime, endTime, location } = params;
  const uid = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}@mbc-matchmaking`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MBC Matchmaking Platform//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(startTime)}`,
    `DTEND:${formatICSDate(endTime)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\n/g, "\\n")}`,
    `LOCATION:${location || ""}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function buildAssignmentNotificationEmail(params: {
  preceptorName: string;
  startupName: string;
  day: string;
  time: string;
  zoomLink?: string;
  cohortName: string;
}): { subject: string; html: string } {
  const { preceptorName, startupName, day, time, zoomLink, cohortName } = params;

  const subject = `MBC Meeting Assignment: ${startupName} — ${day} at ${time}`;
  const zoomSection = zoomLink
    ? `<tr>
        <td style="color:#94a3b8;padding:8px 16px;font-size:14px;border-bottom:1px solid #334155;">Zoom Link</td>
        <td style="color:#e2e8f0;padding:8px 16px;font-size:14px;border-bottom:1px solid #334155;">
          <a href="${zoomLink}" style="color:#818cf8;text-decoration:underline;">${zoomLink}</a>
        </td>
      </tr>`
    : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#312e81,#1e293b);padding:32px;text-align:center;">
      <h1 style="color:#fff;font-size:24px;margin:0 0 8px;">Meeting Assignment</h1>
      <p style="color:#94a3b8;margin:0;font-size:14px;">${cohortName} — MBC Matchmaking</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#e2e8f0;font-size:16px;line-height:1.6;margin:0 0 16px;">
        Hi <strong>${preceptorName}</strong>, you've been assigned to meet with a startup!
      </p>
      <table style="width:100%;border-collapse:collapse;background:#0f172a;border-radius:8px;overflow:hidden;margin:16px 0;">
        <tr>
          <td style="color:#94a3b8;padding:8px 16px;font-size:14px;border-bottom:1px solid #334155;">Startup</td>
          <td style="color:#34d399;padding:8px 16px;font-size:14px;font-weight:700;border-bottom:1px solid #334155;">${startupName}</td>
        </tr>
        <tr>
          <td style="color:#94a3b8;padding:8px 16px;font-size:14px;border-bottom:1px solid #334155;">Day</td>
          <td style="color:#e2e8f0;padding:8px 16px;font-size:14px;border-bottom:1px solid #334155;">${day}</td>
        </tr>
        <tr>
          <td style="color:#94a3b8;padding:8px 16px;font-size:14px;border-bottom:1px solid #334155;">Time</td>
          <td style="color:#e2e8f0;padding:8px 16px;font-size:14px;border-bottom:1px solid #334155;">${time}</td>
        </tr>
        ${zoomSection}
      </table>
      ${zoomLink ? `<div style="text-align:center;margin:24px 0;">
        <a href="${zoomLink}" style="display:inline-block;background:#4f46e5;color:#fff;font-weight:700;font-size:16px;padding:14px 32px;border-radius:8px;text-decoration:none;">
          Join Zoom Meeting
        </a>
      </div>` : ""}
    </div>
    <div style="padding:16px 32px;border-top:1px solid #334155;text-align:center;">
      <p style="color:#475569;font-size:11px;margin:0;">MBC Matchmaking Platform — Master of Business Creation</p>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}

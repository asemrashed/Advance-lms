import nodemailer from "nodemailer";
import {
  SITE_BRAND_NAME,
  SITE_LOGO_PUBLIC_PATH,
} from "@/lib/siteBrandingConstants";

function getAppUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";
  return raw.trim().replace(/\/$/, "");
}

function getSmtpConfig() {
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASS || "").trim().replace(/\s+/g, "");
  const host = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
  const port = Number.parseInt(process.env.SMTP_PORT || "587", 10);
  const fromEmail = (process.env.SMTP_FROM_EMAIL || user).trim();
  const fromName = (process.env.SMTP_FROM_NAME || SITE_BRAND_NAME).trim();

  if (!user || !pass) {
    throw new Error("SMTP_USER and SMTP_PASS must be configured");
  }

  return {
    host,
    port: Number.isFinite(port) ? port : 587,
    user,
    pass,
    fromEmail,
    fromName,
  };
}

export async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const smtp = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  await transporter.sendMail({
    from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}

export async function sendPasswordResetEmail(options: {
  to: string;
  name: string;
  resetToken: string;
}) {
  const appUrl = getAppUrl();
  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(options.resetToken)}`;
  const logoUrl = `${appUrl}${SITE_LOGO_PUBLIC_PATH}`;
  const displayName = options.name.trim() || "there";
  const brand = SITE_BRAND_NAME;

  await sendMail({
    to: options.to,
    subject: `Reset your ${brand} password`,
    text: `Hi ${displayName},\n\nWe received a request to reset your ${brand} password.\n\nOpen this link to set a new password (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, you can ignore this email.\n\n— ${brand}`,
    html: `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; max-width: 520px; margin: 0 auto; color: #1a1a1a; line-height: 1.5;">
        <div style="margin: 0 0 20px;">
          <img
            src="${logoUrl}"
            alt="${brand}"
            width="176"
            height="48"
            style="display: block; height: 48px; width: auto; max-width: 176px; border: 0;"
          />
        </div>
        <h1 style="font-size: 22px; margin: 0 0 8px; font-weight: 700;">Reset your password</h1>
        <p style="margin: 0 0 16px;">Hi ${displayName},</p>
        <p style="margin: 0 0 16px;">We received a request to reset your <strong>${brand}</strong> password.</p>
        <p style="margin: 0 0 16px;">
          <a href="${resetUrl}" style="display: inline-block; background: #0f766e; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;">
            Set new password
          </a>
        </p>
        <p style="margin: 0 0 8px; font-size: 14px; color: #555;">
          Or copy and paste this link into your browser:
        </p>
        <p style="margin: 0 0 24px; font-size: 13px; word-break: break-all; line-height: 1.45;">
          <a href="${resetUrl}" style="color: #0f766e; text-decoration: underline;">${resetUrl}</a>
        </p>
        <p style="margin: 0 0 8px; font-size: 14px; color: #555;">This link expires in 1 hour.</p>
        <p style="margin: 0; font-size: 13px; color: #777;">If you did not request this, you can ignore this email.</p>
        <p style="margin: 24px 0 0; font-size: 13px; color: #777;">— ${brand}</p>
      </div>
    `,
  });
}

export async function sendDeviceForceLogoutOtpEmail(options: {
  to: string;
  name: string;
  otp: string;
  deviceLabel: string;
}) {
  const logoUrl = `${getAppUrl()}${SITE_LOGO_PUBLIC_PATH}`;
  const displayName = options.name.trim() || "there";
  const brand = SITE_BRAND_NAME;

  await sendMail({
    to: options.to,
    subject: `Verify sign-in on a new device — ${brand}`,
    text: `Hi ${displayName},\n\nSomeone is trying to sign in to your ${brand} account on a new device (${options.deviceLabel}).\n\nYour verification code is: ${options.otp}\n\nThis code expires in 10 minutes. If this wasn't you, ignore this email.\n\n— ${brand}`,
    html: `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; max-width: 520px; margin: 0 auto; color: #1a1a1a; line-height: 1.5;">
        <div style="margin: 0 0 20px;">
          <img
            src="${logoUrl}"
            alt="${brand}"
            width="176"
            height="48"
            style="display: block; height: 48px; width: auto; max-width: 176px; border: 0;"
          />
        </div>
        <h1 style="font-size: 22px; margin: 0 0 8px; font-weight: 700;">Verify new device sign-in</h1>
        <p style="margin: 0 0 16px;">Hi ${displayName},</p>
        <p style="margin: 0 0 16px;">
          Someone is trying to sign in to your <strong>${brand}</strong> account on a new device
          (<strong>${options.deviceLabel}</strong>).
        </p>
        <p style="margin: 0 0 8px; font-size: 14px; color: #555;">Enter this verification code to continue:</p>
        <p style="margin: 0 0 24px; font-size: 32px; font-weight: 700; letter-spacing: 0.25em; color: #0f766e;">
          ${options.otp}
        </p>
        <p style="margin: 0 0 8px; font-size: 14px; color: #555;">This code expires in 10 minutes.</p>
        <p style="margin: 0; font-size: 13px; color: #777;">If you did not request this, you can ignore this email.</p>
        <p style="margin: 24px 0 0; font-size: 13px; color: #777;">— ${brand}</p>
      </div>
    `,
  });
}

export async function sendManualEnrollmentEmail(options: {
  to: string;
  name: string;
  courseTitle: string;
  temporaryPassword: string;
  paymentStatus?: string;
  paymentAmount?: number;
}) {
  const appUrl = getAppUrl();
  const loginUrl = `${appUrl}/login`;
  const logoUrl = `${appUrl}${SITE_LOGO_PUBLIC_PATH}`;
  const displayName = options.name.trim() || "there";
  const brand = SITE_BRAND_NAME;
  const courseTitle = options.courseTitle.trim() || "your course";
  const paidNote =
    options.paymentStatus === "paid"
      ? "Your enrollment payment is marked as paid."
      : options.paymentStatus === "pending"
        ? "Your enrollment payment is pending — please complete payment when due."
        : "";

  await sendMail({
    to: options.to,
    subject: `You're enrolled in ${courseTitle} — ${brand}`,
    text: `Hi ${displayName},\n\nYou have been enrolled in "${courseTitle}" on ${brand}.\n\nSign in at: ${loginUrl}\nEmail: ${options.to}\nTemporary password: ${options.temporaryPassword}\n\n${paidNote}\n\nPlease change your password after signing in.\n\n— ${brand}`,
    html: `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; max-width: 520px; margin: 0 auto; color: #1a1a1a; line-height: 1.5;">
        <div style="margin: 0 0 20px;">
          <img
            src="${logoUrl}"
            alt="${brand}"
            width="176"
            height="48"
            style="display: block; height: 48px; width: auto; max-width: 176px; border: 0;"
          />
        </div>
        <h1 style="font-size: 22px; margin: 0 0 8px; font-weight: 700;">Enrollment confirmed</h1>
        <p style="margin: 0 0 16px;">Hi ${displayName},</p>
        <p style="margin: 0 0 16px;">
          You have been enrolled in <strong>${courseTitle}</strong> on <strong>${brand}</strong>.
        </p>
        ${
          paidNote
            ? `<p style="margin: 0 0 16px; font-size: 14px; color: #555;">${paidNote}</p>`
            : ""
        }
        <p style="margin: 0 0 8px; font-size: 14px; color: #555;">Your login details:</p>
        <ul style="margin: 0 0 16px; padding-left: 18px; font-size: 14px; color: #333;">
          <li>Email: <strong>${options.to}</strong></li>
          <li>Temporary password: <strong style="font-family: ui-monospace, monospace;">${options.temporaryPassword}</strong></li>
        </ul>
        <p style="margin: 0 0 16px;">
          <a href="${loginUrl}" style="display: inline-block; background: #0f766e; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;">
            Sign in to start learning
          </a>
        </p>
        <p style="margin: 0 0 8px; font-size: 14px; color: #555;">Please change your password after signing in (Settings → Password).</p>
        <p style="margin: 24px 0 0; font-size: 13px; color: #777;">— ${brand}</p>
      </div>
    `,
  });
}

export async function sendAdminInviteEmail(options: {
  to: string;
  name: string;
  temporaryPassword: string;
  invitedByName?: string;
}) {
  const appUrl = getAppUrl();
  const loginUrl = `${appUrl}/login`;
  const logoUrl = `${appUrl}${SITE_LOGO_PUBLIC_PATH}`;
  const displayName = options.name.trim() || "there";
  const brand = SITE_BRAND_NAME;
  const invitedBy = options.invitedByName?.trim();

  await sendMail({
    to: options.to,
    subject: `You're invited as an admin — ${brand}`,
    text: `Hi ${displayName},\n\nYou have been invited as an admin on ${brand}.${
      invitedBy ? ` Invited by ${invitedBy}.` : ""
    }\n\nSign in at: ${loginUrl}\nEmail: ${options.to}\nTemporary password: ${options.temporaryPassword}\n\nPlease change your password after signing in.\n\n— ${brand}`,
    html: `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; max-width: 520px; margin: 0 auto; color: #1a1a1a; line-height: 1.5;">
        <div style="margin: 0 0 20px;">
          <img
            src="${logoUrl}"
            alt="${brand}"
            width="176"
            height="48"
            style="display: block; height: 48px; width: auto; max-width: 176px; border: 0;"
          />
        </div>
        <h1 style="font-size: 22px; margin: 0 0 8px; font-weight: 700;">Admin invitation</h1>
        <p style="margin: 0 0 16px;">Hi ${displayName},</p>
        <p style="margin: 0 0 16px;">
          You have been invited as an <strong>admin</strong> on <strong>${brand}</strong>.${
            invitedBy ? ` Invited by <strong>${invitedBy}</strong>.` : ""
          }
        </p>
        <p style="margin: 0 0 8px; font-size: 14px; color: #555;">Sign-in details:</p>
        <ul style="margin: 0 0 16px; padding-left: 18px; font-size: 14px; color: #333;">
          <li>Email: <strong>${options.to}</strong></li>
          <li>Temporary password: <strong style="font-family: ui-monospace, monospace;">${options.temporaryPassword}</strong></li>
        </ul>
        <p style="margin: 0 0 16px;">
          <a href="${loginUrl}" style="display: inline-block; background: #0f766e; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;">
            Sign in
          </a>
        </p>
        <p style="margin: 0 0 8px; font-size: 14px; color: #555;">Please change your password after signing in (Settings → Password).</p>
        <p style="margin: 24px 0 0; font-size: 13px; color: #777;">— ${brand}</p>
      </div>
    `,
  });
}


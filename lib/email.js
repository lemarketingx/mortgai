/**
 * Minimal transactional email sender for FINZO.
 *
 * Provider: Resend (https://resend.com) HTTP API — no SDK dependency, plain fetch.
 * Fully driven by environment variables; the app degrades gracefully (logs + no-op)
 * when email is not configured, so nothing breaks in dev/preview environments.
 *
 * Required env vars (set in Vercel / .env.local):
 *   RESEND_API_KEY   — Resend API key (server-side only, never exposed to client)
 *   EMAIL_FROM       — verified sender, e.g. "FINZO <notifications@yourdomain.com>"
 *
 * Optional:
 *   FINZO_ADMIN_EMAIL — fallback recipient for system notifications (see lib/leadNotifications.js)
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function getApiKey() {
  return String(process.env.RESEND_API_KEY || "").trim();
}

function getFrom() {
  return String(process.env.EMAIL_FROM || "").trim();
}

export function isEmailConfigured() {
  return Boolean(getApiKey()) && Boolean(getFrom());
}

/**
 * Send a single email. Never throws — returns { ok, skipped?, error? } so callers
 * can fire-and-forget without risking the parent request flow.
 *
 * @param {{ to: string|string[], subject: string, html: string, text?: string, replyTo?: string }} message
 */
export async function sendEmail({ to, subject, html, text, replyTo } = {}) {
  const recipients = (Array.isArray(to) ? to : [to]).map((addr) => String(addr || "").trim()).filter(Boolean);

  if (recipients.length === 0) {
    return { ok: false, error: "NO_RECIPIENT" };
  }

  if (!isEmailConfigured()) {
    console.warn("[email] skipped — RESEND_API_KEY / EMAIL_FROM not configured", { subject, recipients: recipients.length });
    return { ok: false, skipped: true, error: "EMAIL_NOT_CONFIGURED" };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify({
        from: getFrom(),
        to: recipients,
        subject: String(subject || "").slice(0, 250),
        html: html || undefined,
        text: text || undefined,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn("[email] send failed", { status: res.status, body: body.slice(0, 300) });
      return { ok: false, error: `SEND_FAILED_${res.status}` };
    }

    return { ok: true };
  } catch (error) {
    console.warn("[email] send error", { message: error?.message || String(error) });
    return { ok: false, error: "SEND_EXCEPTION" };
  }
}

/** Escape user-controlled strings before interpolating into HTML email bodies. */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

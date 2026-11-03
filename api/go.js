// Vercel Serverless Function
// File: /api/go.js
//
// Required Vercel environment variable:
//   TURNSTILE_SECRET = your Cloudflare Turnstile SECRET KEY
// Optional:
//   GYBABO_CODE = invite code (defaults to the one below)
//
// The invite code lives only here, on the server. The browser only
// receives the final URL after the captcha passes.

const CODE = process.env.GYBABO_CODE || "BSVBD76R";
const TARGET = "https://gybabo.com/register?code=" + encodeURIComponent(CODE);
const TURNSTILE_VERIFY =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function send(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { ok: false, message: "Method not allowed." });
  }

  const body = req.body || {};
  const token =
    typeof body.turnstileToken === "string" ? body.turnstileToken : "";

  if (!token) {
    return send(res, 400, {
      ok: false,
      message: "Complete the captcha first.",
    });
  }

  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) {
    console.error("TURNSTILE_SECRET is not configured in Vercel.");
    return send(res, 500, {
      ok: false,
      message: "Server error. Try again later.",
    });
  }

  try {
    const r = await fetch(TURNSTILE_VERIFY, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = await r.json().catch(() => null);

    if (!r.ok || !data || !data.success) {
      return send(res, 400, {
        ok: false,
        message: "Captcha failed. Please try again.",
      });
    }

    return send(res, 200, { ok: true, url: TARGET });
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return send(res, 500, {
      ok: false,
      message: "Server error. Try again later.",
    });
  }
}

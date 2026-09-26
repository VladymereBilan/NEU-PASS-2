const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).host : "";
const supabaseWs = supabaseHost ? `wss://${supabaseHost}` : "";

// No nonce here deliberately: Next 14's CSP-nonce support has its own known
// XSS advisory (GHSA-ffhc-5mcf-pf4q), so a static allowlist CSP is the safer
// choice until the framework itself is upgraded past that range.
// Cloudflare Turnstile (bot protection on the public /visit form) needs its
// script allowed, its challenge iframe allowed, and its own network calls
// allowed — challenges.cloudflare.com covers all three uses.
const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

// next dev's Fast Refresh/HMR runtime (react-refresh-utils) evaluates code
// via eval() — without 'unsafe-eval' the browser throws an EvalError on
// every page load and React never hydrates, so every client interaction
// (including this login form's onSubmit) silently falls back to a native,
// unhandled HTML form submission instead of running any app JS. `next build`
// never uses eval, so this carve-out only ever widens the policy in dev.
const SCRIPT_SRC_EXTRA = process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${SCRIPT_SRC_EXTRA} ${TURNSTILE_ORIGIN}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${supabaseHost ? ` https://${supabaseHost}` : ""}`,
  "font-src 'self'",
  `connect-src 'self' ${TURNSTILE_ORIGIN}${supabaseHost ? ` https://${supabaseHost}` : ""}${supabaseWs ? ` ${supabaseWs}` : ""}`,
  `frame-src ${TURNSTILE_ORIGIN}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'"
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: csp },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }
        ]
      }
    ];
  }
};

export default nextConfig;

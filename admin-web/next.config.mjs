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

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${TURNSTILE_ORIGIN}`,
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

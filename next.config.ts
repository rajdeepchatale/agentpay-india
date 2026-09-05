import type { NextConfig } from "next";

/**
 * Response headers.
 *
 * The site takes money and asks for a microphone, so two of these are not
 * hygiene. `X-Frame-Options` stops the checkout being framed inside someone
 * else's page and clicked through invisibly, and `Permissions-Policy` scopes
 * the microphone to this origin so an embedded frame can never reach it.
 *
 * No Content-Security-Policy here on purpose: a wrong one white-screens the
 * app through inline scripts, and a policy that has not been tested against
 * every route is worse than none.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "microphone=(self), camera=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Everything here is per-user and live (donations, balances), so no prerender caching.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  serverExternalPackages: ["pi-backend"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cguxdschojoqbffdrlhm.supabase.co", pathname: "/storage/v1/object/public/**" }],
    formats: ["image/avif", "image/webp"],
  },
  // Pi Browser and the Pi Sandbox load the app in a frame: no X-Frame-Options, and only Pi hosts may frame it.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'self' https://*.pinet.com https://*.minepi.com" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ];
  },
};

export default nextConfig;

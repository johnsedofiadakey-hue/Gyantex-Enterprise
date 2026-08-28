import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Serves uploaded photos as-is instead of resizing them on demand.
    // On-demand resizing runs through a Cloud Function per unique size —
    // real compute cost for very little benefit at this site's traffic and
    // photo count. Trade-off: keep photos you upload in Admin reasonably
    // sized (well under 1MB) since nothing shrinks them for you now.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/v0/b/gyantexenterpr1se.firebasestorage.app/o/**",
      },
      {
        protocol: "https",
        hostname: "gyantexenterpr1se.firebasestorage.app",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/gyantexenterpr1se.firebasestorage.app/**",
      },
    ],
  },
};

export default nextConfig;

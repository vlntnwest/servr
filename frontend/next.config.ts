import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "g10afdaataaj4tkl.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;

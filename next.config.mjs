/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "via.placeholder.com" },
      // Add other hostnames for your actual images here
    ],
  },
};

export default nextConfig;

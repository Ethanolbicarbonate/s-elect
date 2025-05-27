/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        // You can optionally specify port and pathname if needed for more granularity
        // port: '',
        // pathname: '/your-account-specific-path/**', 
      },
      { // Keep your existing placeholder pattern if you still use it
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      // Add any other external image hostnames here
    ],
  },
};

export default nextConfig;

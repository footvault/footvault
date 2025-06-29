/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
   experimental: {
    allowedDevOrigins: [
      'http://192.168.56.1:3000',
      'https://29f8-112-202-97-120.ngrok-free.app',
      'http://localhost:3000', // Added localhost for dev camera access
      'http://192.168.1.11:3000', // Added your real LAN IP for phone access
      'https://18d2-112-202-97-218.ngrok-free.app', // Added your ngrok HTTPS tunnel for secure camera access
    ],
  },
}

export default nextConfig

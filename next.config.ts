import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // html5-qrcode uses browser APIs, exclude from server bundle
  serverExternalPackages: ['html5-qrcode'],
}

export default nextConfig

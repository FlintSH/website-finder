/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['github.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'github.com',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig 
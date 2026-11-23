/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: '.next',
  images: { unoptimized: true },
  trailingSlash: false,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
}

module.exports = nextConfig

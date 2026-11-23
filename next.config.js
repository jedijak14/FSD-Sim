/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: '.next',
  images: { unoptimized: true },
  trailingSlash: false,
}

module.exports = nextConfig

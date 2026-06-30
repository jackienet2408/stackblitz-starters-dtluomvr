/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = nextConfig;

// PWA Configuration
if (process.env.PWA === 'true') {
  const withPWA = require('next-pwa')({
    dest: 'public',
    disable: process.env.NODE_ENV === 'development', // Disable in dev mode
    cacheLifetime: { '*': 60 * 60 * 24 }, // Cache assets for 24 hours
    includeFiles: (pathname) => /(^|\/)(index|image|js)$/.test(pathname),
    register: true,
    skipWaiting: true,
  });

  module.exports = {
    ...withPWA(nextConfig),
    images: {
      deviceSizes: [640, 750, 828, 1080, 1200], // Better PWA image quality
    },
  };
}

/**
 * @file next.config.mjs
 * @location cobot-plus-fyp/next.config.mjs
 * 
 * @description
 * Next.js configuration file for the CObot+ Attendance System.
 * Configures image optimization, security headers, and compression.
 * 
 * @see https://nextjs.org/docs/app/api-reference/next-config-js
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Strict Mode for development-time checks
  reactStrictMode: true,

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Compression
  compress: true,
};

export default nextConfig;

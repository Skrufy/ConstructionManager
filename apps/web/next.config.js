/** @type {import('next').NextConfig} */

// Allowed origins for CORS - set via environment variable or use defaults
// Format: comma-separated list of origins (e.g., "https://yourapp.com,capacitor://localhost")
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS || (
  process.env.NODE_ENV === 'production'
    ? 'https://your-production-domain.com,capacitor://localhost,ionic://localhost'
    : 'http://localhost:3000,http://localhost:3001,capacitor://localhost,ionic://localhost'
);

const nextConfig = {
  // Generate unique build ID for version checking
  generateBuildId: async () => {
    // Use git commit SHA if available (Vercel provides this)
    if (process.env.VERCEL_GIT_COMMIT_SHA) {
      return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 8)
    }
    // Fallback to timestamp
    return `build-${Date.now()}`
  },

  // Expose build ID to client
  env: {
    NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) || `build-${Date.now()}`,
  },

  experimental: {
    // Use native ESM for these packages
    esmExternals: 'loose',
    // Externalize problematic packages for server-side rendering (Next.js 14 syntax)
    serverComponentsExternalPackages: ['pdf-to-img', 'pdfjs-dist', 'canvas'],
  },

  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark native/problematic packages as external to prevent webpack bundling issues
      config.externals = [...(config.externals || []), 'pdfjs-dist', 'pdf-to-img', 'canvas']
    }
    return config
  },

  async headers() {
    return [
      // CORS headers for API routes (iOS/Android app support)
      // Note: For dynamic origin validation, see middleware.ts
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            // Use first allowed origin as default; dynamic validation happens in middleware
            value: allowedOrigins.split(',')[0],
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Authorization, Content-Type, X-Requested-With, Origin',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400',
          },
        ],
      },
      // Static assets with hashes - cache for 1 year (immutable)
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // HTML pages - always revalidate to get latest version after deploys
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=(self)',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net", // Required for Next.js + PDF.js CDN
              "style-src 'self' 'unsafe-inline'", // Required for inline styles
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://sandbox-quickbooks.api.intuit.com https://quickbooks.api.intuit.com https://oauth.platform.intuit.com https://cdn.jsdelivr.net",
              "frame-src 'self' https://*.supabase.co blob:",
              "worker-src 'self' blob:", // Required for PDF.js web workers
              "frame-ancestors 'none'",
              "form-action 'self'",
              "base-uri 'self'",
            ].join('; '),
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig

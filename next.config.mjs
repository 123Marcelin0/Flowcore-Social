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
  // Disable package import optimization to avoid vendor-chunk fs lookups that
  // can fail on Windows (ENOENT for vendor-chunks like lucide-react@x_y.js in dev)
  experimental: {},
  // Simplified webpack config for better Vercel compatibility
  webpack: (config, { isServer }) => {
    // Only apply optimizations for client-side bundles
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000, // Increased for Vercel compatibility
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            framework: {
              chunks: 'all',
              name: 'framework',
              test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|next)[\\/]/,
              priority: 40,
              enforce: true,
            },
          },
        },
      }
    }
    return config
  },
}

// Environment variables configuration with safe defaults for local builds
nextConfig.env = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'DUMMY_OPENAI_KEY',
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-service-role',
  APPLYDESIGN_API_KEY: process.env.APPLYDESIGN_API_KEY || 'dummy-applydesign',
  REIMAGINEHOME_API_KEY: process.env.REIMAGINEHOME_API_KEY || 'dummy-reimagine'
}

export default nextConfig

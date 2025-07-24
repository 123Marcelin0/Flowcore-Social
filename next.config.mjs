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
    optimizePackageImports: ['@/components/ui'],
  },
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

// Environment variables configuration
nextConfig.env = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
}

export default nextConfig

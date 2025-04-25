import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow OpenAI package in server components/API routes
  serverExternalPackages: ['openai'],
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Add support for native Node modules in server components
    if (isServer) {
      config.externals = [...(config.externals || []), 'openai'];
    }
    
    return config;
  }
};

export default nextConfig;

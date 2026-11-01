import type { NextConfig } from 'next';
import { fileURLToPath } from 'node:url';

const nextConfig: NextConfig = {
  transpilePackages: ['restaurant-ordering-harness'],
  serverExternalPackages: ['@mastra/*'],
  outputFileTracingRoot: fileURLToPath(new URL('..', import.meta.url)),
  webpack: (config) => {
    config.resolve.extensionAlias = { ...config.resolve.extensionAlias, '.js': ['.ts', '.tsx', '.js', '.jsx'] };
    return config;
  },
};
export default nextConfig;

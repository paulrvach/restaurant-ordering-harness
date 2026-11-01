/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['restaurant-ordering-harness'],
  serverExternalPackages: ['@mastra/*'],
  outputFileTracingRoot: new URL('.', import.meta.url).pathname,
  webpack: (config) => {
    // Resolve the harness's NodeNext-style `.js` relative imports to their
    // TypeScript sources when bundling the shared package.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    return config;
  },
};

export default nextConfig;

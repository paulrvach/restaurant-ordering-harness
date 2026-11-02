import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  agentRules: false,
  turbopack: { root: fileURLToPath(new URL("./", import.meta.url)) },
  serverExternalPackages: ["@mastra/core", "@mastra/ai-sdk"],
};

export default nextConfig;

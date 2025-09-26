import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 不使用 turbopack (默認行為)
  reactStrictMode: false,
  // Transpile packages that need proper handling
  transpilePackages: ['streamdown', '@asgard-js/react'],
};

export default nextConfig;

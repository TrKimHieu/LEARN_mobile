import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@learn/contracts', '@learn/ui'],
  typedRoutes: false,
};

export default nextConfig;

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  /**
   * @react-pdf/renderer uses Node APIs (canvas, stream) and must only run
   * on the client. Marking it as an external for the server bundle prevents
   * SSR errors while still allowing dynamic import() on the client.
   */
  serverExternalPackages: ['@react-pdf/renderer'],
  turbopack: {},
};

export default nextConfig;

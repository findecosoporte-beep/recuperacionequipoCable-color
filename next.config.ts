import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  compress: true,
  transpilePackages: ["primereact"],
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  outputFileTracingIncludes: {
    "/": ["./node_modules/.prisma/**/*", "./node_modules/@prisma/client/**/*"],
  },
};

export default nextConfig;

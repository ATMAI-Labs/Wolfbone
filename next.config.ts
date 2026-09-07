import type { NextConfig } from 'next';
const config: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  outputFileTracingIncludes: {
    '/api/library': ['./data/mathlib/**/*'],
    '/explore': ['./data/mathlib/**/*'],
  },
};
export default config;

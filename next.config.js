/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/activate-funded',
        destination: '/funded-activation',
        permanent: false,
      },
      {
        source: '/activate-funded/:path*',
        destination: '/funded-activation/:path*',
        permanent: false,
      },
      {
        source: '/gauntlet',
        destination: '/challenge',
        permanent: false,
      },
      {
        source: '/gauntlet/:path*',
        destination: '/challenge',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;

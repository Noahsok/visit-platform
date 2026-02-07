/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@visit/ui", "@visit/lib", "@visit/db"],
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      { source: '/checkin', destination: '/checkin.html' },
      { source: '/staff', destination: '/staff.html' },
      { source: '/dashboard', destination: '/dashboard.html' },
      { source: '/admin', destination: '/admin.html' },
      { source: '/admin/history', destination: '/admin-history.html' },
      { source: '/admin/expired', destination: '/admin-expired.html' },
    ];
  },
};

module.exports = nextConfig;

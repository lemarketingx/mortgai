export default function handler(req, res) {
  return res.status(200).json({
    hasAdminPassword: Boolean(process.env.ADMIN_PASSWORD),
    length: process.env.ADMIN_PASSWORD ? String(process.env.ADMIN_PASSWORD).trim().length : 0,
    environment: process.env.VERCEL_ENV || "unknown",
  });
}

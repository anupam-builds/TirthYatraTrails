/**
 * Next.js Pages Router API Route for Staff & Admin Online Presence
 * Route: /api/admin/staff/[id]/presence
 */

export default function handler(req, res) {
  const { id } = req.query;
  const isOnline = Boolean(req.body?.isOnline ?? req.body?.is_online ?? true);
  const lastSeen = req.body?.lastSeen || new Date().toISOString();

  if (req.method === 'PATCH' || req.method === 'POST' || req.method === 'PUT') {
    return res.status(200).json({
      success: true,
      id: id || 'unknown',
      isOnline,
      isCurrentlyLoggedIn: isOnline,
      lastSeen,
      lastActiveAt: lastSeen,
      updatedAt: new Date().toISOString(),
    });
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      id: id || 'unknown',
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'PUT', 'OPTIONS']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

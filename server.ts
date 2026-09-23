import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { db } from './src/server/db.js';
import bcrypt from 'bcryptjs';
import { generateGoogleAuthUrl, handleGoogleOAuthCallback } from './src/server/auth.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Initialize database non-blocking for serverless warm start
db.init().catch((err) => console.warn('DB init warning:', err));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Static directory for uploaded image assets
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (e) {
    console.warn('Could not create uploads directory:', e);
  }
}
app.use('/uploads', express.static(uploadsDir));

// Helper auth check
const verifyAdminToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (process.env.NODE_ENV !== 'production') {
      (req as any).user = { id: 'user-admin', email: 'admin@tirthyatratrails.com', role: 'ADMIN' };
      return next();
    }
    return res.status(401).json({ error: 'Unauthorized. Admin credentials required.' });
  }
  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    if (decoded.role !== 'ADMIN' && process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Forbidden. Admin role required.' });
    }
    (req as any).user = decoded;
    next();
  } catch {
    if (process.env.NODE_ENV !== 'production') {
      (req as any).user = { id: 'user-admin', email: 'admin@tirthyatratrails.com', role: 'ADMIN' };
      return next();
    }
    return res.status(401).json({ error: 'Invalid authentication token.' });
  }
};

function parseDeviceDetails(userAgent?: string): string {
  if (!userAgent) return 'Desktop Browser';
  let browser = 'Browser';
  let os = 'Unknown OS';

  if (userAgent.includes('Edg/')) browser = 'Edge';
  else if (userAgent.includes('Chrome/')) browser = 'Chrome';
  else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) browser = 'Safari';
  else if (userAgent.includes('Firefox/')) browser = 'Firefox';

  if (userAgent.includes('Windows')) os = 'Windows 11/10';
  else if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS')) os = 'macOS';
  else if (userAgent.includes('iPhone')) os = 'iPhone iOS';
  else if (userAgent.includes('iPad')) os = 'iPadOS';
  else if (userAgent.includes('Android')) os = 'Android Device';
  else if (userAgent.includes('Linux')) os = 'Linux OS';

  return `${browser} on ${os}`;
}

const verifyStaffToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Staff credentials required.' });
  }
  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    if (decoded.role === 'ADMIN') {
      (req as any).staff = decoded;
      return next();
    }
    if (decoded.role !== 'STAFF') {
      return res.status(403).json({ error: 'Forbidden. Staff access required.' });
    }

    const liveStaff = db.getStaffMemberById(decoded.id);
    if (!liveStaff) {
      return res.status(401).json({ error: 'Staff account has been removed.' });
    }

    if (liveStaff.isBlocked || !liveStaff.isActive) {
      return res.status(403).json({
        error: 'Account Blocked: Your access has been revoked by the administrator. Active session terminated.',
        isBlocked: true,
        blockedReason: liveStaff.blockedReason || 'Revoked by administrator',
      });
    }

    (req as any).staff = liveStaff;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid authentication token.' });
  }
};

// ===================== AUTH ROUTES =====================
app.get('/api/auth/google/url', (req, res) => {
  const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
  const authInfo = generateGoogleAuthUrl(origin);
  res.json(authInfo);
});

app.post('/api/auth/google/direct', async (req, res) => {
  try {
    const { email, name, image, sub } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required for Google Sign-In.' });
    }
    const user = await db.findOrCreateOAuthUser({
      provider: 'google',
      providerAccountId: sub || `google-${Date.now()}`,
      email,
      name: name || 'Google Devotee',
      image: image || '',
    });
    const token = Buffer.from(JSON.stringify(user)).toString('base64');
    return res.json({ user, token });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) {
    return res.send(`
      <!DOCTYPE html><html><head><title>Google Sign-In</title></head>
      <body style="font-family:sans-serif;padding:30px;text-align:center;">
        <h3>Authentication Error: ${error || 'Failed'}</h3>
      </body></html>
    `);
  }
  try {
    const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
    const { user, token } = await handleGoogleOAuthCallback(code as string, origin);
    res.send(`
      <!DOCTYPE html><html><head><title>Success</title></head>
      <body><script>
        if (window.opener) {
          window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: '${token}', user: ${JSON.stringify(user)} }, '*');
          window.close();
        } else { window.location.href = '/'; }
      </script></body></html>
    `);
  } catch (err: any) {
    res.send(`<h3>Error: ${err.message}</h3>`);
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, portal } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const userRecord = db.getUserByEmail(email);
    if (!userRecord || !userRecord.password) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const isMatch = await bcrypt.compare(password, userRecord.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (portal === 'admin' && userRecord.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access Denied. Admin privileges required.' });
    }
    const { password: _, ...safeUser } = userRecord;
    const token = Buffer.from(JSON.stringify(safeUser)).toString('base64');
    return res.json({ user: safeUser, token });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

app.post('/api/auth/staff/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const staffMember = db.findStaffByEmail(email);
    if (!staffMember) {
      return res.status(401).json({ error: 'No staff account found.' });
    }
    if (staffMember.password && staffMember.password !== password) {
      return res.status(401).json({ error: 'Invalid staff credentials.' });
    }
    const clientIp = ((req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '122.161.48.12').replace('::ffff:', '');
    const deviceStr = parseDeviceDetails(req.headers['user-agent']);
    if (staffMember.isBlocked || !staffMember.isActive) {
      return res.status(403).json({ error: 'Access Blocked by admin.', isBlocked: true });
    }
    db.recordStaffLogin(staffMember.id, clientIp, deviceStr);
    const refreshedStaff = db.getStaffMemberById(staffMember.id) || staffMember;
    const { password: _, ...safeStaff } = refreshedStaff;
    const token = Buffer.from(JSON.stringify(safeStaff)).toString('base64');
    return res.json({ user: safeStaff, token });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/staff/logout', (req, res) => {
  const { staffId } = req.body;
  if (staffId) db.recordStaffLogout(staffId);
  return res.json({ success: true });
});

app.get('/api/staff/session/check', verifyStaffToken, (req, res) => {
  return res.json({ ok: true, staff: (req as any).staff });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    const user = await db.createUser(name, email, password, 'USER', phone);
    const token = Buffer.from(JSON.stringify(user)).toString('base64');
    return res.status(201).json({ user, token });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ user: null });
  }
  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    const freshUser = db.getUserById(decoded.id);
    return res.json({ user: freshUser || decoded });
  } catch {
    return res.status(401).json({ user: null });
  }
});

// ===================== ADMIN PROVISIONING RPC ROUTES =====================
app.post('/api/admin/create-sub-admin', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let callerEmail = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
        callerEmail = decoded.email || '';
      } catch {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
            callerEmail = payload.email || '';
          }
        } catch {}
      }
    }

    callerEmail = callerEmail.toLowerCase().trim();

    // STRICT SERVER-SIDE ROOT ADMIN ASSERTION
    if (callerEmail !== 'anupamsaxena.dev@gmail.com') {
      return res.status(403).json({
        code: 'P0001',
        message: 'Only root admin anupamsaxena.dev@gmail.com can provision new administrators',
        details: 'Unauthorized sub-admin provisioning attempted without root administrator authorization.',
      });
    }

    const { target_email, target_password } = req.body;
    if (!target_email || !target_password) {
      return res.status(400).json({
        code: '22023',
        message: 'target_email and target_password are required.',
      });
    }

    const cleanEmail = target_email.toLowerCase().trim();
    if (!cleanEmail.includes('@')) {
      return res.status(400).json({
        code: '22023',
        message: 'Invalid target email address.',
      });
    }

    if (target_password.length < 6) {
      return res.status(400).json({
        code: '22023',
        message: 'Password must be at least 6 characters.',
      });
    }

    const safeUser = await db.provisionAdminUser(cleanEmail, target_password, callerEmail);

    return res.status(200).json({
      success: true,
      user_id: safeUser.id,
      email: cleanEmail,
      role: 'ADMIN',
      provisioned_by: callerEmail,
      created_at: safeUser.createdAt,
      message: 'Sub-admin successfully provisioned with full administrator access.',
    });
  } catch (err: any) {
    return res.status(500).json({
      code: '500',
      message: err.message || 'Internal server error during sub-admin provisioning.',
    });
  }
});

app.get('/api/admin/administrators', (req, res) => {
  try {
    const adminUsers = db.getAdminUsers();
    return res.json(adminUsers);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===================== DEDICATED ADMIN PROVISIONING & CREDENTIAL SYSTEM =====================
app.post(['/api/admin/provision-user', '/api/admin/rpc/provision_admin'], async (req, res) => {
  try {
    const rawEmail = req.body.admin_email || req.body.email || '';
    const rawPassword = req.body.admin_password || req.body.password || '';
    const rawRole = req.body.role || req.body.admin_role || 'Admin (Enterprise Operations)';

    if (!rawEmail || typeof rawEmail !== 'string') {
      return res.status(400).json({ success: false, error: 'Administrator email address is required.' });
    }
    const cleanEmail = rawEmail.toLowerCase().trim();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return res.status(400).json({ success: false, error: 'Please enter a valid administrator email address.' });
    }

    if (!rawPassword || typeof rawPassword !== 'string' || rawPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Initial password must be at least 6 characters in length.' });
    }

    // 1. Create or update user credentials in internal authentication store (bcrypt hashed)
    const adminUser = await db.provisionAdminUser(cleanEmail, rawPassword, 'Super Admin');

    // 2. Register/update in admin_allowlist
    const allowlistEntry = db.addAdminAllowlistEntry(cleanEmail, rawRole, 'Active & Authorized');

    // 3. Sync to Supabase Auth and remote admin_allowlist
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://tbsvmgmhazsiciimpuim.supabase.co';
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_UVZU3WJhR1sz8EuseHB6Uw_lxb5_-ea';

    try {
      // Direct remote allowlist upsert
      await fetch(`${supabaseUrl}/rest/v1/admin_allowlist`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          email: cleanEmail,
          role: rawRole,
        }),
        signal: AbortSignal.timeout(2000),
      }).catch(() => {});

      // Direct remote Supabase Auth signUp sync
      await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: cleanEmail,
          password: rawPassword,
          data: { role: rawRole, is_admin: true },
        }),
        signal: AbortSignal.timeout(2000),
      }).catch(() => {});
    } catch (syncErr: any) {
      console.warn('[provision-user] Remote Supabase Auth sync notice:', syncErr?.message);
    }

    return res.status(201).json({
      success: true,
      user: {
        id: adminUser.id || allowlistEntry.id,
        email: cleanEmail,
        role: allowlistEntry.role || rawRole,
        created_at: allowlistEntry.created_at,
        status: 'Active & Authorized',
      },
      allowlist: allowlistEntry,
      message: `Administrator account successfully provisioned for ${cleanEmail}. They can now authenticate via /admin/login.`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to provision administrator account.' });
  }
});

// ===================== ADMIN ALLOWLIST REST ROUTES =====================
app.get('/api/admin/allowlist', (req, res) => {
  try {
    let list = db.getAdminAllowlist();
    const { email } = req.query;
    if (email && typeof email === 'string') {
      const cleanEmail = email.toLowerCase().trim();
      list = list.filter((e) => e.email.toLowerCase() === cleanEmail);
    }
    return res.json(list);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/allowlist', (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Valid email address is required.' });
    }
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail.includes('@')) {
      return res.status(400).json({ error: 'Invalid email address format.' });
    }
    const entry = db.addAdminAllowlistEntry(cleanEmail, role || 'admin');
    // Return array matching PostgREST representation
    return res.status(201).json([entry]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/allowlist/:idOrEmail', (req, res) => {
  try {
    const { idOrEmail } = req.params;
    if (!idOrEmail) {
      return res.status(400).json({ error: 'id or email is required.' });
    }
    const clean = idOrEmail.toLowerCase().trim();
    if (clean === 'anupamsaxena.dev@gmail.com') {
      return res.status(403).json({ error: 'Root administrator cannot be removed from allowlist.' });
    }
    const success = db.removeAdminAllowlistEntry(idOrEmail);
    return res.status(success ? 200 : 404).json({ success, message: success ? 'Admin removed from allowlist.' : 'Entry not found.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===================== PUBLIC DATA ROUTES =====================
app.get('/api/cities', (req, res) => { res.json(db.getCities()); });
app.get('/api/hotels', (req, res) => {
  const { cityId, city, query } = req.query;
  res.json(db.getHotels((cityId || city) as string, query as string));
});
app.get('/api/hotels/:id', (req, res) => {
  const hotel = db.getHotelById(req.params.id);
  if (!hotel) return res.status(404).json({ error: 'Hotel not found' });
  res.json(hotel);
});
app.get('/api/packages', (req, res) => {
  const { category, query } = req.query;
  res.json(db.getPackages(category as string, query as string));
});
app.get('/api/packages/:id', (req, res) => {
  const pkg = db.getPackageById(req.params.id);
  if (!pkg) return res.status(404).json({ error: 'Package not found' });
  res.json(pkg);
});
app.get('/api/inquiries', (req, res) => { res.json(db.getInquiries()); });
app.post('/api/inquiries', (req, res) => {
  try { res.status(201).json(db.createInquiry(req.body)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});
app.get('/api/my-inquiries', (req, res) => {
  res.json(db.getInquiries(req.query.userId as string));
});
app.get('/api/reviews', (req, res) => {
  res.json(db.getReviews(req.query.featured === 'true'));
});
app.get('/api/reviews/:id', (req, res) => {
  const r = db.getReviewById(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  res.json(r);
});
app.post('/api/reviews', (req, res) => {
  try { res.status(201).json(db.createReview(req.body)); }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ===================== PILGRIMAGE COMPANION MATCHING =====================
app.get('/api/companions', (req, res) => { res.json(db.getCompanions(req.query as any)); });
app.get('/api/companions/:id', (req, res) => {
  const c = db.getCompanionById(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  res.json(c);
});
app.post('/api/companions', (req, res) => {
  try { res.status(201).json(db.createCompanion(req.body)); }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});
app.put('/api/companions/:id', (req, res) => {
  try { res.json(db.updateCompanion(req.params.id, req.body)); }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});
app.delete('/api/companions/:id', (req, res) => {
  try { db.deleteCompanion(req.params.id); res.json({ success: true }); }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});
app.post('/api/companions/:id/connect', (req, res) => {
  try { res.status(201).json(db.createCompanionConnection({ ...req.body, companionProfileId: req.params.id })); }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});
app.get('/api/companions/:id/connections', (req, res) => { res.json(db.getCompanionConnections(req.params.id)); });
app.patch('/api/companions/connections/:connId/status', (req, res) => {
  try { res.json(db.updateCompanionConnectionStatus(req.params.connId, req.body.status)); }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ===================== ADMIN ROUTES =====================
app.post('/api/admin/hotels', verifyAdminToken, (req, res) => {
  try { res.status(201).json(db.createHotel(req.body)); }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});
app.put('/api/admin/hotels/:id', verifyAdminToken, (req, res) => {
  try { res.json(db.updateHotel(req.params.id, req.body)); }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});
app.delete(['/api/admin/hotels/:id', '/api/admin/hotels'], verifyAdminToken, (req, res) => {
  const target = (req.params.id || req.query.id || req.body?.id) as string;
  db.deleteHotel(target); res.json({ success: true, id: target });
});

app.post('/api/admin/packages', verifyAdminToken, (req, res) => {
  try { res.status(201).json(db.createPackage(req.body)); }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});
app.put('/api/admin/packages/:id', verifyAdminToken, (req, res) => {
  try { res.json(db.updatePackage(req.params.id, req.body)); }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});
app.delete(['/api/admin/packages/:id', '/api/admin/packages'], verifyAdminToken, (req, res) => {
  const target = (req.params.id || req.query.id || req.body?.id) as string;
  db.deletePackage(target); res.json({ success: true, id: target });
});

app.post('/api/admin/upload-image', verifyAdminToken, (req, res) => {
  try {
    const { image, filename } = req.body;
    const matches = image?.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const ext = matches[1].split('/')[1] || 'jpg';
      const cleanName = `${Date.now()}-${filename || 'img'}.${ext}`;
      fs.writeFileSync(path.join(uploadsDir, cleanName), Buffer.from(matches[2], 'base64'));
      return res.json({ url: `/uploads/${cleanName}` });
    }
    return res.json({ url: image });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/cities', verifyAdminToken, (req, res) => {
  try { res.status(201).json(db.createCity(req.body)); }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});
app.put('/api/admin/cities/:id', verifyAdminToken, (req, res) => {
  try { res.json(db.updateCity(req.params.id, req.body)); }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});
app.delete(['/api/admin/cities/:id', '/api/admin/cities'], verifyAdminToken, (req, res) => {
  const target = (req.params.id || req.query.id || req.body?.id) as string;
  db.deleteCity(target); res.json({ success: true, id: target });
});

app.get('/api/admin/inquiries', verifyAdminToken, (req, res) => { res.json(db.getInquiries()); });
app.put('/api/admin/inquiries/:id', verifyAdminToken, (req, res) => {
  try { res.json(db.updateInquiry(req.params.id, req.body)); }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});
app.put('/api/staff/inquiries/:id', verifyStaffToken, (req, res) => {
  try { res.json(db.updateInquiry(req.params.id, req.body)); }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});
app.patch('/api/admin/inquiries/:id/status', verifyAdminToken, (req, res) => {
  try { res.json(db.toggleInquiryStatus(req.params.id)); }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});
app.delete('/api/admin/inquiries/:id', verifyAdminToken, (req, res) => {
  db.deleteInquiry(req.params.id); res.json({ success: true });
});
app.get('/api/admin/inquiries/trash', verifyAdminToken, (req, res) => { res.json(db.getDeletedInquiries()); });
app.post('/api/admin/inquiries/:id/restore', verifyAdminToken, (req, res) => {
  const { staffId, staffName } = req.body || {};
  res.json(db.restoreInquiry(req.params.id, staffId, staffName));
});
app.delete('/api/admin/inquiries/:id/permanent', verifyAdminToken, (req, res) => {
  db.permanentlyDeleteInquiry(req.params.id); res.json({ success: true });
});
app.post('/api/admin/inquiries/trash/empty', verifyAdminToken, (req, res) => {
  db.emptyTrash(); res.json({ success: true });
});
app.put('/api/staff/inquiries/:id/status', verifyStaffToken, (req, res) => {
  const { status, staff } = req.body;
  res.json(db.updateInquiryStatusByStaff(req.params.id, status, staff || (req as any).staff));
});
app.post('/api/admin/inquiries/:id/unlock', verifyAdminToken, (req, res) => {
  res.json(db.adminUnlockInquiry(req.params.id, req.body.newStatus));
});
app.post('/api/inquiries/:id/notes', (req, res) => {
  res.json(db.addInquiryNote(req.params.id, req.body));
});
app.post('/api/admin/inquiries/:id/assign', verifyAdminToken, (req, res) => {
  res.json(db.assignInquiryStaff(req.params.id, req.body.staffId, req.body.staffName));
});

// Staff Mgmt
app.get('/api/admin/staff', verifyAdminToken, (req, res) => { res.json(db.getStaffMembers()); });
app.get('/api/admin/staff/sessions', verifyAdminToken, (req, res) => { res.json(db.getStaffSessionMonitor()); });
app.get('/api/admin/staff/logs', verifyAdminToken, (req, res) => { res.json(db.getStaffLogs(req.query.staffId as string)); });
app.post('/api/admin/staff', verifyAdminToken, (req, res) => {
  try {
    const clientIp = ((req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1').replace('::ffff:', '');
    res.status(201).json(db.createStaffMember(req.body, { name: (req as any).user?.name || 'Admin', ip: clientIp, device: parseDeviceDetails(req.headers['user-agent']) }));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});
app.put('/api/admin/staff/:id', verifyAdminToken, (req, res) => {
  try { res.json(db.updateStaffMember(req.params.id, req.body)); }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});
app.patch('/api/admin/staff/:id/block', verifyAdminToken, (req, res) => {
  try {
    const clientIp = ((req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1').replace('::ffff:', '');
    res.json(db.blockStaffMember(req.params.id, Boolean(req.body.isBlocked), req.body.reason, { name: (req as any).user?.name || 'Admin', ip: clientIp, device: parseDeviceDetails(req.headers['user-agent']) }));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});
app.post('/api/admin/staff/:id/reset-password', verifyAdminToken, (req, res) => {
  try {
    if (!req.body.newPassword || req.body.newPassword.trim().length < 6) {
      return res.status(400).json({ error: 'Min 6 chars' });
    }
    res.json(db.updateStaffMember(req.params.id, { password: req.body.newPassword.trim() }));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});
app.patch('/api/admin/staff/:id/status', verifyAdminToken, (req, res) => {
  res.json(db.toggleStaffStatus(req.params.id));
});
app.delete('/api/admin/staff/:id', verifyAdminToken, (req, res) => {
  db.deleteStaffMember(req.params.id); res.json({ success: true });
});

// Reviews
app.get('/api/admin/reviews', verifyAdminToken, (req, res) => { res.json(db.getReviews(false)); });
app.post('/api/admin/reviews', verifyAdminToken, (req, res) => {
  try { res.status(201).json(db.createReview(req.body)); }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});
app.put('/api/admin/reviews/:id', verifyAdminToken, (req, res) => {
  try { res.json(db.updateReview(req.params.id, req.body)); }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});
app.patch('/api/admin/reviews/:id/featured', verifyAdminToken, (req, res) => {
  res.json(db.toggleReviewFeatured(req.params.id));
});
app.delete(['/api/admin/reviews/:id', '/api/admin/reviews'], verifyAdminToken, (req, res) => {
  const target = (req.params.id || req.query.id || req.body?.id) as string;
  db.deleteReview(target); res.json({ success: true, id: target });
});

app.post('/api/admin/reset-data', verifyAdminToken, async (req, res) => {
  try { res.json({ success: true, data: await db.resetData() }); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Health check
app.get('/api/health', (req, res) => { res.json({ status: 'ok', time: new Date().toISOString() }); });

// Explicit 404 for unmatched /api/*
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Global API error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req && req.path && req.path.startsWith('/api')) {
    console.error('API Error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  }
  next(err);
});

// Vite middleware or static bundle for production
if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

// Only listen locally if not on Vercel
if (process.env.VERCEL !== '1') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TirthYatraTrails server running on http://0.0.0.0:${PORT}`);
  });
}

export default app;
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './src/server/db.js';
import bcrypt from 'bcryptjs';
import { generateGoogleAuthUrl, handleGoogleOAuthCallback } from './src/server/auth.js';

async function startServer() {
  await db.init();
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Helper auth check
  const verifyAdminToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized. Admin credentials required.' });
    }
    const token = authHeader.replace('Bearer ', '');
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
      if (decoded.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden. Admin role required.' });
      }
      (req as any).user = decoded;
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid authentication token.' });
    }
  };

  // ===================== AUTH ROUTES =====================
  // Google OAuth URL Generation
  app.get('/api/auth/google/url', (req, res) => {
    const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
    const authInfo = generateGoogleAuthUrl(origin);
    res.json(authInfo);
  });

  // Google Direct / Mock Auth Fallback (For Seamless Testing in Dev Sandbox)
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

  // OAuth Callback Handler (Popup PostMessage Flow)
  app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
    const { code, error } = req.query;
    if (error || !code) {
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Google Sign-In</title></head>
          <body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:30px;text-align:center;background:#faf8f5;color:#0f294a;">
            <div style="max-width:400px;margin:0 auto;background:white;padding:24px;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
              <h3 style="color:#ea580c;margin-top:0;">Google Authentication</h3>
              <p style="font-size:14px;color:#64748b;">${error || 'Authentication could not be completed.'}</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${error || 'Failed'}' }, '*');
                  setTimeout(() => window.close(), 1500);
                }
              </script>
            </div>
          </body>
        </html>
      `);
    }

    try {
      const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
      const { user, token } = await handleGoogleOAuthCallback(code as string, origin);

      res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Google Sign-In Success</title></head>
          <body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:40px 20px;text-align:center;background:#0f294a;color:white;">
            <div style="max-width:420px;margin:0 auto;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);padding:30px;border-radius:24px;">
              <h2 style="color:#ea580c;margin:0 0 10px 0;font-size:22px;">TirthYatraTrails</h2>
              <p style="font-size:15px;margin-bottom:12px;font-weight:600;">Welcome, ${user.name || user.email}!</p>
              <p style="font-size:13px;color:#cbd5e1;">Completing secure Google sign-in...</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'OAUTH_AUTH_SUCCESS',
                    token: '${token}',
                    user: ${JSON.stringify(user)}
                  }, '*');
                  window.close();
                } else {
                  window.location.href = '/';
                }
              </script>
            </div>
          </body>
        </html>
      `);
    } catch (err: any) {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Google Sign-In Error</title></head>
          <body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:30px;text-align:center;background:#faf8f5;">
            <div style="max-width:400px;margin:0 auto;background:white;padding:24px;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
              <h3 style="color:#dc2626;margin-top:0;">Authentication Error</h3>
              <p style="font-size:13px;color:#475569;">${err.message}</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${err.message.replace(/'/g, "\\'")}' }, '*');
                  setTimeout(() => window.close(), 3000);
                }
              </script>
            </div>
          </body>
        </html>
      `);
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
        return res.status(403).json({ error: 'Access Denied. You do not have Admin privileges.' });
      }

      const { password: _, ...safeUser } = userRecord;
      const token = Buffer.from(JSON.stringify(safeUser)).toString('base64');

      return res.json({ user: safeUser, token });
    } catch (err: any) {
      console.error('Login error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, password, phone } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      }

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

  // ===================== PUBLIC DATA ROUTES =====================
  // Cities
  app.get('/api/cities', (req, res) => {
    res.json(db.getCities());
  });

  // Hotels
  app.get('/api/hotels', (req, res) => {
    const { cityId, query } = req.query;
    res.json(db.getHotels(cityId as string, query as string));
  });

  app.get('/api/hotels/:id', (req, res) => {
    const hotel = db.getHotelById(req.params.id);
    if (!hotel) return res.status(404).json({ error: 'Hotel not found' });
    res.json(hotel);
  });

  // Packages
  app.get('/api/packages', (req, res) => {
    const { category, query } = req.query;
    res.json(db.getPackages(category as string, query as string));
  });

  app.get('/api/packages/:id', (req, res) => {
    const pkg = db.getPackageById(req.params.id);
    if (!pkg) return res.status(404).json({ error: 'Package not found' });
    res.json(pkg);
  });

  // Inquiries
  app.get('/api/inquiries', (req, res) => {
    res.json(db.getInquiries());
  });

  app.post('/api/inquiries', (req, res) => {
    try {
      const inquiry = db.createInquiry(req.body);
      return res.status(201).json(inquiry);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/my-inquiries', (req, res) => {
    const userId = req.query.userId as string;
    res.json(db.getInquiries(userId));
  });

  // Reviews / Traveller Stories (Public)
  app.get('/api/reviews', (req, res) => {
    const featured = req.query.featured === 'true';
    res.json(db.getReviews(featured));
  });

  app.get('/api/reviews/:id', (req, res) => {
    const review = db.getReviewById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });
    res.json(review);
  });

  // ===================== ADMIN ENTERPRISE ROUTES =====================
  // Admin Hotel Management
  app.post('/api/admin/hotels', verifyAdminToken, (req, res) => {
    try {
      const newHotel = db.createHotel(req.body);
      res.status(201).json(newHotel);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/admin/hotels/:id', verifyAdminToken, (req, res) => {
    try {
      const updated = db.updateHotel(req.params.id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/admin/hotels/:id', verifyAdminToken, (req, res) => {
    try {
      db.deleteHotel(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Admin Package Management
  app.post('/api/admin/packages', verifyAdminToken, (req, res) => {
    try {
      const newPkg = db.createPackage(req.body);
      res.status(201).json(newPkg);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/admin/packages/:id', verifyAdminToken, (req, res) => {
    try {
      const updated = db.updatePackage(req.params.id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/admin/packages/:id', verifyAdminToken, (req, res) => {
    try {
      db.deletePackage(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Admin Cities Management
  app.post('/api/admin/cities', verifyAdminToken, (req, res) => {
    try {
      const newCity = db.createCity(req.body);
      res.status(201).json(newCity);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/admin/cities/:id', verifyAdminToken, (req, res) => {
    try {
      const updated = db.updateCity(req.params.id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/admin/cities/:id', verifyAdminToken, (req, res) => {
    try {
      db.deleteCity(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Admin Inquiries Management
  app.get('/api/admin/inquiries', verifyAdminToken, (req, res) => {
    res.json(db.getInquiries());
  });

  app.put('/api/admin/inquiries/:id/status', verifyAdminToken, (req, res) => {
    try {
      const { status } = req.body;
      const updated = db.updateInquiryStatus(req.params.id, status);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.patch('/api/admin/inquiries/:id/status', verifyAdminToken, (req, res) => {
    try {
      const updated = db.toggleInquiryStatus(req.params.id);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/admin/inquiries/:id', verifyAdminToken, (req, res) => {
    try {
      db.deleteInquiry(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Admin Reviews / Traveller Stories Management
  app.get('/api/admin/reviews', verifyAdminToken, (req, res) => {
    res.json(db.getReviews(false));
  });

  app.post('/api/admin/reviews', verifyAdminToken, (req, res) => {
    try {
      const newReview = db.createReview(req.body);
      res.status(201).json(newReview);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/admin/reviews/:id', verifyAdminToken, (req, res) => {
    try {
      const updated = db.updateReview(req.params.id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.patch('/api/admin/reviews/:id/featured', verifyAdminToken, (req, res) => {
    try {
      const updated = db.toggleReviewFeatured(req.params.id);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/admin/reviews/:id', verifyAdminToken, (req, res) => {
    try {
      db.deleteReview(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/admin/reset-data', verifyAdminToken, async (req, res) => {
    try {
      const data = await db.resetData();
      res.json({ success: true, message: 'Database reset to initial rich seeds', data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Location & Geocoding Autocomplete (Nominatim with India filter + PIN code fallback)
  app.get('/api/geo/autocomplete', async (req, res) => {
    try {
      const q = String(req.query.q || '').trim();
      if (!q || q.length < 2) {
        return res.json([]);
      }

      // Check if 6-digit PIN code
      if (/^\d{6}$/.test(q)) {
        const pinRes = await fetch(`https://api.postalpincode.in/pincode/${q}`);
        if (pinRes.ok) {
          const pinData = await pinRes.json();
          return res.json({ type: 'pincode', data: pinData });
        }
      }

      // Nominatim search
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=in&q=${encodeURIComponent(q)}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'TirthYatraTrails-PilgrimageApp/1.0 (traveldesk@tirthyatratrails.com)',
          'Accept': 'application/json',
          'Accept-Language': 'en-IN,en;q=0.9',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return res.json({ type: 'nominatim', data });
      }

      // Fallback to Photon
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8`;
      const photonRes = await fetch(photonUrl);
      if (photonRes.ok) {
        const photonData = await photonRes.json();
        return res.json({ type: 'photon', data: photonData });
      }

      res.json({ type: 'empty', data: [] });
    } catch (err: any) {
      res.json({ type: 'error', error: err.message, data: [] });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Explicit 404 Handler for /api/* routes to prevent HTML SPA fallback
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
  });

  // Global Error Handler for API routes
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api')) {
      console.error('API Error:', err);
      return res.status(err.status || 500).json({
        error: err.message || 'Internal server error occurred',
      });
    }
    next(err);
  });

  // ===================== VITE MIDDLEWARE SETUP =====================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TirthYatraTrails server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup failure:', err);
});

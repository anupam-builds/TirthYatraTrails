import { db } from './db.js';

export interface GoogleAuthConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}

export const getGoogleAuthConfig = (reqHostOrigin?: string): GoogleAuthConfig => {
  const baseAppUrl = process.env.APP_URL || reqHostOrigin || 'http://localhost:3000';
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: `${baseAppUrl.replace(/\/$/, '')}/auth/callback`,
  };
};

export function generateGoogleAuthUrl(origin: string): { url: string; isConfigured: boolean } {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const baseAppUrl = process.env.APP_URL || origin || 'http://localhost:3000';
  const redirectUri = `${baseAppUrl.replace(/\/$/, '')}/auth/callback`;

  if (!clientId) {
    return {
      url: '',
      isConfigured: false,
    };
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
  });

  return {
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    isConfigured: true,
  };
}

export async function handleGoogleOAuthCallback(code: string, origin: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseAppUrl = process.env.APP_URL || origin || 'http://localhost:3000';
  const redirectUri = `${baseAppUrl.replace(/\/$/, '')}/auth/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured in environment.');
  }

  // 1. Exchange authorization code for tokens
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenResponse.ok) {
    const errText = await tokenResponse.text();
    throw new Error(`Google token exchange failed: ${errText}`);
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;
  const idToken = tokenData.id_token;
  const refreshToken = tokenData.refresh_token;
  const expiresIn = tokenData.expires_in;

  // 2. Fetch user profile from Google UserInfo
  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!userInfoRes.ok) {
    throw new Error('Failed to retrieve user profile from Google.');
  }

  const profile = await userInfoRes.json();
  const googleId = profile.sub;
  const email = profile.email;
  const name = profile.name || profile.given_name || 'Pilgrim Devotee';
  const image = profile.picture || '';

  // 3. Link or create user with role USER
  const user = await db.findOrCreateOAuthUser({
    provider: 'google',
    providerAccountId: googleId,
    email,
    name,
    image,
    accessToken,
    refreshToken,
    idToken,
    expiresAt: expiresIn ? Math.floor(Date.now() / 1000) + expiresIn : undefined,
  });

  const token = Buffer.from(JSON.stringify(user)).toString('base64');
  return { user, token };
}

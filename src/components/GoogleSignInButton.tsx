import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { Loader2 } from 'lucide-react';

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (msg: string) => void;
  text?: string;
  isSubmitting?: boolean;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
  text = 'Continue with Google',
  isSubmitting = false,
}) => {
  const { loginCustomerWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      // Validate origin if needed
      if (!event.data || typeof event.data !== 'object') return;

      if (event.data.type === 'OAUTH_AUTH_SUCCESS') {
        const { user, token } = event.data;
        if (user && token) {
          loginCustomerWithGoogle(user, token);
          setLoading(false);
          if (onSuccess) onSuccess();
        }
      } else if (event.data.type === 'OAUTH_AUTH_ERROR') {
        setLoading(false);
        const errMsg = event.data.error || 'Google Sign-In failed. Please try again.';
        if (onError) onError(errMsg);
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [loginCustomerWithGoogle, onSuccess, onError]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);

      // Check Google OAuth configuration
      const config = await api.getGoogleAuthUrl();

      if (config.isConfigured && config.url) {
        // Open Google OAuth Popup
        const width = 500;
        const height = 650;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
          config.url,
          'GoogleSignInPopup',
          `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
        );

        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          // If popup is blocked, inform user or fallback
          throw new Error('Popup blocked by browser. Please allow popups for Google Sign-In.');
        }
      } else {
        // Instant Google Sign-In Demo Mode for Dev Sandbox
        const sampleEmail = 'devotee.google@tirthyatratrails.com';
        const sampleName = 'Devotee Pilgrim';
        const res = await api.googleDirectLogin({
          email: sampleEmail,
          name: sampleName,
          image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
          sub: 'google-devotee-108',
        });

        loginCustomerWithGoogle(res.user, res.token);
        setLoading(false);
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setLoading(false);
      if (onError) onError(err.message || 'Google Sign-In failed');
    }
  };

  return (
    <div className="w-full">
      <button
        id="google-signin-btn"
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading || isSubmitting}
        className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-medium py-3 px-4 rounded-xl border border-slate-300 shadow-sm hover:shadow transition-all duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-sm"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
            <span>Connecting to Google...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="whitespace-nowrap">{text}</span>
          </>
        )}
      </button>
    </div>
  );
};

export const AuthOrDivider: React.FC<{ label?: string }> = ({ label = 'OR' }) => {
  return (
    <div className="relative my-5 flex items-center justify-center">
      <div className="border-t border-slate-200 w-full absolute"></div>
      <span className="bg-white px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 relative z-10">
        {label}
      </span>
    </div>
  );
};

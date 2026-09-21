import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { googleLogin } from '@/store/authStore';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (momentListener?: (notification: any) => void) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          cancel: () => void;
        };
        oauth2: {
          initCodeClient: (config: any) => {
            requestCode: () => void;
          };
        };
      };
    };
  }
}

interface GoogleAuthButtonProps {
  mode?: 'login' | 'register';
  onSuccess?: () => void;
  onError?: (err: string) => void;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  mode = 'login',
  onSuccess,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isGsiLoaded, setIsGsiLoaded] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const gisContainerRef = useRef<HTMLDivElement>(null);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || '';
  const isConfigured = Boolean(clientId && !clientId.includes('your-google-client-id'));

  // Load Google Identity Services SDK script dynamically
  useEffect(() => {
    if (!isConfigured) return;

    if (window.google?.accounts?.id) {
      setIsGsiLoaded(true);
      return;
    }

    const scriptId = 'google-identity-services-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => setIsGsiLoaded(true);
      script.onerror = () => {
        console.warn('Failed to load Google Identity Services SDK script.');
      };
      document.body.appendChild(script);
    } else {
      script.addEventListener('load', () => setIsGsiLoaded(true));
    }
  }, [isConfigured]);

  const handleAuthSuccess = () => {
    if (onSuccess) {
      onSuccess();
      return;
    }
    const redirect = searchParams.get('redirect');
    if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
      navigate(redirect, { replace: true });
    } else {
      navigate('/app', { replace: true });
    }
  };

  const handleCredentialResponse = async (credential: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await googleLogin({ credential });
      handleAuthSuccess();
    } catch (err: any) {
      const msg = err.message || 'Google sign-in failed. Please try again.';
      setErrorMsg(msg);
      if (onError) onError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize GIS One Tap / Credential Handler when loaded
  useEffect(() => {
    if (!isGsiLoaded || !isConfigured || !window.google?.accounts?.id) return;

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential?: string }) => {
          if (response.credential) {
            handleCredentialResponse(response.credential);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // Render official hidden GIS button if needed for standard flow
      if (gisContainerRef.current) {
        gisContainerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(gisContainerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: mode === 'register' ? 'signup_with' : 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 380,
        });
      }
    } catch (e) {
      console.warn('GIS initialization error:', e);
    }
  }, [isGsiLoaded, isConfigured, clientId, mode]);

  const handleClick = () => {
    if (!isConfigured) {
      setErrorMsg('Google Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID in your frontend .env file.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    // If GIS popup code client is available, use popup
    if (window.google?.accounts?.oauth2?.initCodeClient) {
      try {
        const client = window.google.accounts.oauth2.initCodeClient({
          client_id: clientId,
          scope: 'openid email profile',
          callback: async (response: { code?: string; error?: string }) => {
            if (response.error) {
              setIsLoading(false);
              setErrorMsg(`Google sign-in was cancelled or encountered an error (${response.error}).`);
              return;
            }
            if (response.code) {
              try {
                // In Google Identity Services popup mode (initCodeClient),
                // the redirect_uri for server-side token exchange must be 'postmessage'
                await googleLogin({ code: response.code, redirect_uri: 'postmessage' });
                handleAuthSuccess();
              } catch (err: any) {
                const msg = err.message || 'Google authentication failed.';
                setErrorMsg(msg);
                if (onError) onError(msg);
              } finally {
                setIsLoading(false);
              }
            }
          },
        });
        client.requestCode();
        return;
      } catch (err) {
        console.warn('Popup code client failed, falling back to redirect:', err);
      }
    }

    // Fallback: Full page redirect to Google OAuth 2.0 authorization endpoint
    const redirectUri = `${window.location.origin}/auth/callback`;
    const redirectParam = searchParams.get('redirect') || '';
    const state = JSON.stringify({ mode, redirect: redirectParam });

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent('openid email profile')}&` +
      `state=${encodeURIComponent(state)}&` +
      `prompt=select_account`;

    window.location.href = authUrl;
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Container for GIS renderButton fallback if preferred */}
      <div ref={gisContainerRef} style={{ display: 'none' }} />

      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        style={{
          width: '100%',
          padding: '13px 16px',
          borderRadius: '12px',
          backgroundColor: '#FFFFFF',
          color: '#1F2937',
          border: '1.5px solid rgba(154,110,86,0.2)',
          fontSize: '15px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          transition: 'all 0.2s ease',
          opacity: isLoading ? 0.75 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isLoading) {
            e.currentTarget.style.backgroundColor = '#F9FAFB';
            e.currentTarget.style.borderColor = 'rgba(154,110,86,0.35)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isLoading) {
            e.currentTarget.style.backgroundColor = '#FFFFFF';
            e.currentTarget.style.borderColor = 'rgba(154,110,86,0.2)';
          }
        }}
      >
        {isLoading ? (
          <>
            <Loader2 size={18} className="animate-spin text-gray-500" />
            <span>Connecting to Google...</span>
          </>
        ) : (
          <>
            {/* Google G Logo */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.67 15.63 16.89 16.79 15.72 17.57V20.34H19.28C21.36 18.42 22.56 15.6 22.56 12.25Z"
                fill="#4285F4"
              />
              <path
                d="M12 23C14.97 23 17.46 22.02 19.28 20.34L15.72 17.57C14.73 18.23 13.48 18.63 12 18.63C9.14 18.63 6.71 16.7 5.84 14.12H2.18V16.96C3.99 20.53 7.7 23 12 23Z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.12C5.62 13.47 5.49 12.75 5.49 12C5.49 11.25 5.62 10.53 5.84 9.88V7.04H2.18C1.43 8.54 1 10.21 1 12C1 13.79 1.43 15.46 2.18 16.96L5.84 14.12Z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38C13.62 5.38 15.06 5.93 16.2 7.02L19.36 3.86C17.45 2.08 14.97 1 12 1C7.7 1 3.99 3.47 2.18 7.04L5.84 9.88C6.71 7.3 9.14 5.38 12 5.38Z"
                fill="#EA4335"
              />
            </svg>
            <span>{mode === 'register' ? 'Sign up with Google' : 'Continue with Google'}</span>
          </>
        )}
      </button>

      {errorMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 12px',
            borderRadius: '8px',
            backgroundColor: 'rgba(220,38,38,0.06)',
            border: '1px solid rgba(220,38,38,0.2)',
            color: '#DC2626',
            fontSize: '13px',
            marginTop: '12px',
          }}
        >
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};

export default GoogleAuthButton;

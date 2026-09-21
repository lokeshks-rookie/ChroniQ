import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { googleLogin } from '@/store/authStore';

export const OAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      const stateParam = searchParams.get('state');

      if (error) {
        setStatus('error');
        setErrorMessage(errorDescription || `Google authentication error: ${error}`);
        return;
      }

      if (!code) {
        setStatus('error');
        setErrorMessage('No authorization code was received from Google.');
        return;
      }

      try {
        const redirectUri = `${window.location.origin}/auth/callback`;
        await googleLogin({ code, redirect_uri: redirectUri });

        setStatus('success');

        let targetRedirect = '/app';
        if (stateParam) {
          try {
            const parsedState = JSON.parse(stateParam);
            if (parsedState.redirect && parsedState.redirect.startsWith('/') && !parsedState.redirect.startsWith('//')) {
              targetRedirect = parsedState.redirect;
            }
          } catch {
            // Ignore JSON parse errors in state
          }
        }

        // Smooth brief transition
        setTimeout(() => {
          navigate(targetRedirect, { replace: true });
        }, 600);
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err.message || 'Failed to complete Google authentication. Please try again.');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-base)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--color-base)',
          padding: '40px',
          borderRadius: '24px',
          boxShadow: '0 12px 40px rgba(25,8,1,0.06)',
          border: '1px solid rgba(154,110,86,0.1)',
          textAlign: 'center',
        }}
      >
        {status === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <Loader2 size={36} className="animate-spin text-amber-800" style={{ color: 'var(--color-accent)' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-ink)' }}>
              Verifying Google Account
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>
              Connecting with ChroniQ and securing your session...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <CheckCircle2 size={40} style={{ color: 'var(--color-success)' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-ink)' }}>
              Authentication Successful
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>
              Welcome to ChroniQ. Redirecting you to your patient dashboard...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'rgba(220,38,38,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#DC2626',
              }}
            >
              <AlertCircle size={24} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-ink)' }}>
              Sign-In Failed
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.5 }}>
              {errorMessage}
            </p>

            <Link
              to="/login"
              style={{
                marginTop: '16px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                borderRadius: '12px',
                backgroundColor: 'var(--color-ink)',
                color: 'var(--color-base)',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              <ArrowLeft size={16} />
              Return to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default OAuthCallbackPage;

// app/(public)/student-signup/verify/page.js
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const emailFromQuery = searchParams.get('email');
    if (emailFromQuery) {
      setEmail(decodeURIComponent(emailFromQuery));
    } else {
      // Handle case where email is not in query params, maybe redirect
      setError('Email not found in URL. Please start over.');
    }
  }, [searchParams]);

  const handleSubmitVerification = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');

    if (!email) {
        setError('Email is missing. Please restart the sign-up process.');
        setIsLoading(false);
        return;
    }

    try {
      const res = await fetch('/api/auth/student-signup/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, password, confirmPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to complete sign-up.');
      } else {
        setMessage(data.message + " Redirecting to login...");
        setTimeout(() => {
          router.push('/student-login');
        }, 3000);
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!email && !error) { // If email not yet set from query and no initial error
      return <div className="text-center p-5">Loading email information...</div>;
  }

  return (
    <main className="d-flex h-100 justify-content-center align-items-center" style={{ backgroundImage: 'url(/assets/background-grid.svg)' }}>
        <div className="bg-white p-4 p-md-5 rounded shadow-sm border" style={{ maxWidth: '500px', width: '100%' }}>
            <h2 className="text-center text-primary mb-4">Student Sign Up - Step 2</h2>
            <p className="text-center text-muted">
                A verification code was sent to <strong>{email || "your email"}</strong>.
            </p>
            {message && <div className="alert alert-success">{message}</div>}
            {error && <div className="alert alert-danger">{error}</div>}

            <form onSubmit={handleSubmitVerification}>
                <div className="mb-3">
                <label htmlFor="token" className="form-label">Verification Code (OTP)</label>
                <input
                    type="text"
                    className="form-control"
                    id="token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    required
                    disabled={isLoading}
                    maxLength={6}
                />
                </div>
                <div className="mb-3">
                <label htmlFor="password_signup" className="form-label">New Password</label>
                <input
                    type="password"
                    className="form-control"
                    id="password_signup"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                />
                </div>
                <div className="mb-3">
                <label htmlFor="confirmPassword_signup" className="form-label">Confirm New Password</label>
                <input
                    type="password"
                    className="form-control"
                    id="confirmPassword_signup"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                />
                </div>
                <button type="submit" className="btn btn-primary w-100" disabled={isLoading}>
                {isLoading ? 'Verifying...' : 'Complete Sign Up'}
                </button>
            </form>
             <div className="mt-3 text-center">
                <Link href="/student-signup" className="text-secondary d-block">
                    Need to resend code or change email?
                </Link>
                <Link href="/student-login" className="text-secondary d-block mt-1">
                    Already have an account? Log In
                </Link>
            </div>
        </div>
    </main>
  );
}

// Wrap with Suspense because useSearchParams needs it for client components in app router
export default function StudentVerifyForm() {
    return (
        <Suspense fallback={<div className="d-flex h-100 justify-content-center align-items-center">Loading...</div>}>
            <VerifyForm />
        </Suspense>
    );
}
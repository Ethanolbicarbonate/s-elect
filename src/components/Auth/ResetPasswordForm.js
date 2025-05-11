// src/components/Auth/ResetPasswordForm.js
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ActualResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [userType, setUserType] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    const emailFromQuery = searchParams.get('email');
    const tokenFromQuery = searchParams.get('token');
    const typeFromQuery = searchParams.get('type');

    if (emailFromQuery) setEmail(decodeURIComponent(emailFromQuery));
    if (tokenFromQuery) setToken(tokenFromQuery);
    if (typeFromQuery) setUserType(typeFromQuery);

    if (!emailFromQuery || !tokenFromQuery || !typeFromQuery) {
      displayFeedback('Invalid or missing reset link parameters. Please request a new link.', true);
    }
  }, [searchParams]);

   const displayFeedback = (text, isError = false) => {
    if (isError) setError(text); else setMessage(text);
    setShowFeedback(true);
    setTimeout(() => {
      setShowFeedback(false);
      setTimeout(() => {
        setError('');
        setMessage('');
      }, 500);
    }, 5000);
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !token || !userType) {
        displayFeedback('Missing critical information from URL. Please try the reset process again.', true);
        return;
    }
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch('/api/auth/password-reset/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, userType, token, newPassword, confirmNewPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        displayFeedback(data.error || 'Failed to reset password.', true);
      } else {
        displayFeedback(data.message || 'Password reset successfully!', false);
        setTimeout(() => {
          router.push(userType === 'student' ? '/student-login' : '/admin-login');
        }, 3000); // Redirect after message display
      }
    } catch (err) {
      console.error(err);
      displayFeedback('An unexpected error occurred.', true);
    } finally {
      setIsLoading(false);
    }
  };

  if ((!email || !token || !userType) && !error) {
      return <div className="text-center p-5">Loading reset information...</div>;
  }

  return (
    <div className="flex-grow-1 d-flex flex-column align-items-center px-4 overflow-auto">
      <h5 className="mb-4 text-primary">Reset Your Password</h5>
      <p className="fs-7 text-secondary mb-3">
        Enter the OTP sent to <span className="text-primary">{email}</span> and your new password.
      </p>
      {(message || error) && (
        <div
          className={`alert ${error ? 'alert-danger' : 'alert-success'} position-fixed top-0 start-50 translate-middle-x mt-3 z-3 fade ${showFeedback ? 'show' : ''}`}
          role="alert"
        >
          {error || message}
        </div>
      )}
      <form onSubmit={handleSubmit} className="w-100" style={{ maxWidth: '400px' }}>
        <div className="mb-3 text-start fs-7 text-secondary">
          <label htmlFor="otp_reset" className="form-label">One-Time Password (OTP)</label>
          <input
            type="text"
            className="form-control"
            id="otp_reset"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
            maxLength={6}
            disabled={isLoading}
          />
        </div>

        <div className="row">
          <div className="col-md-6 mb-3 text-start fs-7 text-secondary">
            <label htmlFor="new_password_reset" className="form-label">
            New Password
            </label>
            <input
              type="password"
              className="form-control"
              id="new_password_reset"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="col-md-6 mb-3 text-start fs-7 text-secondary">
            <label htmlFor="confirm_new_password_reset" className="form-label">
            Confirm New Password
            </label>
            <input
              type="password"
              className="form-control"
              id="confirm_new_password_reset"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-lg fs-6 shadow-sm w-100" disabled={isLoading}>
          {isLoading ? 'Resetting...' : 'Reset Password'}
        </button>
        <hr className="border-1 border-secondary opacity-20 my-4" />
         <div className="d-grid gap-2">
            <Link href={userType === 'student' ? "/student-login" : (userType === 'admin' ? "/admin-login" : "/")} className="btn custom-btn fs-6 btn-lg text-secondary border shadow-sm">
                Back to Login
            </Link>
        </div>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
    return (
         <Suspense fallback={<div className="d-flex h-100 justify-content-center align-items-center">Loading...</div>}>
            <ActualResetPasswordForm />
        </Suspense>
    )
}
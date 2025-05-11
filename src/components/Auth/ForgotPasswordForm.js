// src/components/Auth/ForgotPasswordForm.js
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ForgotPasswordEmailForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [userType, setUserType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showFeedback, setShowFeedback] = useState(false); // For both error and message
  const router = useRouter();

  useEffect(() => {
    const typeFromQuery = searchParams.get('type');
    if (typeFromQuery && (typeFromQuery === 'student' || typeFromQuery === 'admin')) {
      setUserType(typeFromQuery);
    } else {
      setError('Invalid user type specified. Please return to the login page.');
      // router.push('/'); // Optionally redirect
    }
  }, [searchParams]);

  const displayFeedback = (text, isError = false) => {
    if (isError) setError(text); else setMessage(text);
    setShowFeedback(true);
    setTimeout(() => {
      setShowFeedback(false);
      setTimeout(() => { // Ensure fade out completes before clearing
        setError('');
        setMessage('');
      }, 500);
    }, 5000); // Show feedback for 5 seconds
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userType) {
        displayFeedback('User type is missing. Please go back and try again.', true);
        return;
    }
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch('/api/auth/password-reset/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, userType }),
      });
      const data = await res.json();

      if (!res.ok) {
        displayFeedback(data.error || `Failed to initiate password reset for ${userType}.`, true);
      } else {
        displayFeedback(data.message || `Password reset OTP sent if ${userType} account exists.`);
        // Do NOT redirect immediately here, let user see the message.
        // The next step is for them to check email and go to reset-password page.
      }
    } catch (err) {
      console.error(err);
      displayFeedback('An unexpected error occurred.', true);
    } finally {
      setIsLoading(false);
    }
  };

  if (!userType && !error) {
      return <div className="text-center p-5">Loading user type information...</div>;
  }

  return (
    <div className="flex-grow-1 d-flex flex-column align-items-center px-4 overflow-auto">
      <h5 className="mb-4 text-primary">Forgot {userType.charAt(0).toUpperCase() + userType.slice(1)} Password</h5>
      {(message || error) && (
        <div
          className={`alert ${error ? 'alert-danger' : 'alert-success'} position-fixed top-0 start-50 translate-middle-x mt-3 z-3 fade ${showFeedback ? 'show' : ''}`}
          role="alert"
        >
          {error || message}
        </div>
      )}
      <form onSubmit={handleSubmit} className="w-100" style={{ maxWidth: '400px' }}>
        <p className="fs-7 text-secondary mb-3">
          Enter the email address associated with your {userType} account. We&apos;ll send you an OTP to reset your password.
        </p>
        <div className="mb-3 text-start fs-7 text-secondary">
          <label htmlFor="email_forgot" className="form-label">Email Address</label>
          <input
            type="email"
            className="form-control"
            id="email_forgot"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder={userType === 'student' ? "juan.delacruz@wvsu.edu.ph" : "admin.role@s-elect.app"}
            disabled={isLoading || !userType}
          />
        </div>
        <button type="submit" className="btn btn-primary btn-lg fs-6 shadow-sm w-100" disabled={isLoading || !userType}>
          {isLoading ? 'Sending OTP...' : 'Send OTP'}
        </button>
        <hr className="border-1 border-secondary opacity-20 my-4" />
        <div className="d-grid gap-2">
          <Link href={userType === 'student' ? "/student-login" : "/admin-login"} className="btn custom-btn fs-6 btn-lg text-secondary border shadow-sm">
            Back to Login
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function ForgotPasswordPage() {
    return (
        <Suspense fallback={<div className="d-flex h-100 justify-content-center align-items-center">Loading...</div>}>
            <ForgotPasswordEmailForm />
        </Suspense>
    )
}
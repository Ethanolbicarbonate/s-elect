'use client';

import { useState } from 'react';
import { signIn } from "next-auth/react";
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLoginForm() {
  const [credential, setCredential] = useState(''); // Could be email or username
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    // Basic client-side validation
    if (!credential || !password) {
      setError('Please enter your credentials and password.');
      setIsLoading(false);
      return;
    }

    try {
      const result = await signIn("admin-credentials", { // Use the correct provider ID
        redirect: false, // Don't automatically redirect, handle it manually
        email: email,
        password: password,
      });

      if (result?.error) {
         // Handle specific errors if needed, otherwise show generic message
        console.error("Sign-in error:", result.error);
        setError("Login failed. Please check your email and password."); // STD-LOG-FR-005, STD-LOG-FR-008
        setIsLoading(false);
      } else if (result?.ok) {
        // Sign-in successful
        console.log("Admin sign-in successful");
        // Redirect to student dashboard (STD-LOG-FR-004)
        router.push('/admin/dashboard');
        // No need to setIsLoading(false) as we are navigating away
      } else {
         // Catch any other unexpected situations
         setError("An unexpected error occurred during login.");
         setIsLoading(false);
      }
    } catch (err) {
       // Catch network errors or other exceptions during the signIn process
      console.error('Login submission error:', err);
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
    // No finally block needed for setIsLoading if navigating away on success
  };
  return (
    <div className="flex-grow-1 d-flex flex-column align-items-center px-4 overflow-auto">
      <h5 className="mb-4 text-primary">Admin Login</h5>
      <form onSubmit={handleSubmit} className="w-100" style={{ maxWidth: '400px' }}>
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        <div className="mb-3 text-start fs-7 text-secondary">
          <label htmlFor="adminCredential" className="form-label">
            University Credential (Email/Username)
          </label>
          <input
            type="text" // Use text to allow email or username
            className="form-control"
            id="adminCredential"
            placeholder="Enter your admin email or username"
            value={credential}
            onChange={(e) => setCredential(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        <div className="mb-3 text-start fs-7 text-secondary">
          <label htmlFor="adminPassword" className="form-label">
            Password
          </label>
          <input
            type="password"
            className="form-control"
            id="adminPassword"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        <hr className='border-1 border-secondary opacity-20 my-4'></hr>
        <div className="d-grid gap-2">
          <button type="submit" className="btn btn-primary btn-lg fs-6 shadow-sm" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                {' '}Logging In...
              </>
            ) : (
              'Login'
            )}
          </button>
           <Link href="/" className="btn custom-btn fs-6 btn-lg text-secondary border shadow-sm">
                Back to Role Selection
            </Link>
        </div>
      </form>
    </div>
  );
}
'use client';

import { useState } from 'react';
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

    // --- Placeholder for API Call ---
    try {
      console.log('Submitting admin login:', { credential }); // Log data being sent

      // Replace with your actual API endpoint and logic
      // Example:
      // const response = await fetch('/api/auth/admin-login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ credential, password }),
      // });
      // const data = await response.json();

      // if (!response.ok) {
      //   throw new Error(data.message || 'Login failed. Please check your credentials.');
      // }

      // --- Mock Success & Redirect ---
      // Simulate a successful login after 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Admin login successful (mock)');

      // On successful login, redirect based on role (logic determined by API response)
      // Example: if (data.role === 'SuperAdmin') router.push('/admin/dashboard');
      // router.push('/admin/dashboard'); // Assuming '/admin/dashboard' is the admin entry point

      // TEMPORARY: Redirect back to home for now until admin dashboard exists
      router.push('/');
      alert("Mock Admin Login Success! Redirecting... (Implement actual dashboard route later)");


    } catch (err) {
      console.error('Admin login error:', err);
      setError(err.message || 'An error occurred during login.');
    } finally {
      setIsLoading(false);
    }
    // --- End Placeholder ---
  };

  return (
    <div className="flex-grow-1 d-flex flex-column align-items-center p-4 overflow-auto">
      <h4 className="mb-4 text-primary">Admin Login</h4>
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
        <br></br>
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
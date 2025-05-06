'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // Use next/navigation for App Router
import Link from 'next/link';

export default function StudentLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (event) => {
    event.preventDefault(); // Prevent default form submission
    setError(''); // Clear previous errors
    setIsLoading(true);

    // Basic client-side validation
    if (!email.endsWith('@wvsu.edu.ph')) {
      setError('Please use your official WVSU email (@wvsu.edu.ph).');
      setIsLoading(false);
      return;
    }
    if (!password) {
        setError('Password cannot be empty.');
        setIsLoading(false);
        return;
    }

    // --- Placeholder for API Call ---
    try {
      console.log('Submitting student login:', { email }); // Log data being sent (remove password logging in production)

      // Replace with your actual API endpoint and logic
      // Example:
      // const response = await fetch('/api/auth/student-login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email, password }),
      // });

      // const data = await response.json();

      // if (!response.ok) {
      //   throw new Error(data.message || 'Login failed. Please check your credentials.');
      // }

      // --- Mock Success & Redirect ---
      // Simulate a successful login after 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Student login successful (mock)');

      // On successful login & 2FA (handle 2FA flow based on API response)
      // Redirect to dashboard (STD-LOG-FR-004)
      // router.push('/dashboard'); // Assuming '/dashboard' is the student dashboard route

       // TEMPORARY: Redirect back to home for now until dashboard exists
       router.push('/');
       alert("Mock Login Success! Redirecting... (Implement actual dashboard route later)");


    } catch (err) {
      console.error('Student login error:', err);
      // Display generic error (STD-LOG-FR-008)
      setError(err.message || 'An error occurred during login.');
    } finally {
      setIsLoading(false);
    }
    // --- End Placeholder ---
  };

  return (
    <div className="flex-grow-1 d-flex flex-column align-items-center p-4 overflow-auto">
      <h4 className="mb-4 text-primary">Student Login</h4>
      <form onSubmit={handleSubmit} className="w-100" style={{ maxWidth: '400px' }}>
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        <div className="mb-3 text-start fs-7 text-secondary">
          <label htmlFor="studentEmail" className="form-label">
            WVSU Email address
          </label>
          <input
            type="email"
            className="form-control"
            id="studentEmail"
            aria-describedby="emailHelp"
            placeholder="juan.delacruz@wvsu.edu.ph"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required // Basic HTML5 validation
            disabled={isLoading}
          />
           {/* Add help text if needed according to STD-LOG-FR-003 */}
           {/* <div id="emailHelp" className="form-text">We'll never share your email with anyone else.</div> */}
        </div>
        <div className="mb-3 text-start">
          <label htmlFor="studentPassword" className="form-label fs-7 text-secondary">
            Password
          </label>
          <input
            type="password"
            className="form-control"
            id="studentPassword"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        {/* Add 2FA input field here if needed AFTER initial login or as part of it */}
        {/* Example:
          <div className="mb-3 text-start">
            <label htmlFor="student2FA" className="form-label">
              2FA Code
            </label>
            <input type="text" className="form-control" id="student2FA" ... />
          </div>
        */}
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
      {/* Add link for password recovery if applicable */}
      {/* <div className="mt-3">
        <a href="/forgot-password">Forgot Password?</a>
      </div> */}
    </div>
  );
}
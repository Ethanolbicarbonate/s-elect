"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation"; //App Router
import Link from "next/link";

export default function StudentLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showError, setShowError] = useState(false);
  const router = useRouter();

  // Effect to handle fade-out animation when error is set
  useEffect(() => {
    if (error) {
      setShowError(true);
    }
  }, [error]);

  const displayError = (message) => {
    setError(message);
    // The useEffect will handle showing the error

    setTimeout(() => {
      // Start the fade out
      setShowError(false);

      // Clear the error message after fade animation completes
      setTimeout(() => {
        setError("");
      }, 500); // Match with Bootstrap's transition duration
    }, 3000);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("student-credentials", {
        // Use the correct provider ID
        redirect: false, // Don't automatically redirect, handle it manually
        email: email,
        password: password,
      });

      if (result?.error) {
        // Handle specific errors if needed, otherwise show generic message
        console.error("Sign-in error:", result.error);
        displayError("Login failed. Please check your email and password."); // STD-LOG-FR-005, STD-LOG-FR-008
        setIsLoading(false);
      } else if (result?.ok) {
        console.log("Student sign-in successful");
        // Redirect to student dashboard (STD-LOG-FR-004)
        router.push("/dashboard"); // Make sure this matches your student dashboard route
        // No need to setIsLoading(false) as we are navigating away
      } else {
        displayError("An unexpected error occurred during login.");
        setIsLoading(false);
      }
    } catch (err) {
      // Catch network errors or other exceptions during the signIn process
      console.error("Login submission error:", err);
      displayError("An error occurred. Please try again.");
      setIsLoading(false);
    }
    // No finally block needed for setIsLoading if navigating away on success
  };

  return (
    <div className="flex-grow-1 d-flex flex-column align-items-center px-4 overflow-auto">
      <h5 className="mb-4 text-primary">Student Login</h5>
      <form
        onSubmit={handleSubmit}
        className="w-100"
        style={{ maxWidth: "400px" }}
      >
        {error && (
          <div
            className={`alert alert-danger position-fixed top-0 start-50 translate-middle-x mt-3 z-3 fade ${
              showError ? "show" : ""
            }`}
            role="alert"
          >
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
        <div className="mb-1 text-start">
          <label
            htmlFor="studentPassword"
            className="form-label fs-7 text-secondary"
          >
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
        <p className="text-end fs-7">
          <Link href="/forgot-password?type=student" className="text-secondary text-decoration-none">
            Forgot Password?
          </Link>
        </p>
        <hr className="border-1 border-secondary opacity-20 my-4"></hr>
        <div className="d-grid gap-2 pb-4">
          <button
            type="submit"
            className="btn btn-primary btn-lg fs-6 shadow-sm"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                ></span>{" "}
                Logging In...
              </>
            ) : (
              "Login"
            )}
          </button>
          <Link
            href="/"
            className="btn custom-btn fs-6 btn-lg text-secondary border shadow-sm"
          >
            Back to Role Selection
          </Link>
          <p className="fs-7 text-secondary mt-1">
            Don&apos;t have an account yet?{" "}
            <Link
              href="/student-signup"
              className="text-primary text-decoration-none"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </form>
      {/* Add link for password recovery if applicable */}
      {/* <div className="mt-3">
        <a href="/forgot-password">Forgot Password?</a>
      </div> */}
    </div>
  );
}

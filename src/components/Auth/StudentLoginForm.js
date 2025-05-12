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
  };

  return (
    <div className="scroll-container flex-grow-1 d-flex flex-column align-items-center px-4 overflow-auto">
      <p className="my-4 text-secondary fs-6">Student Login</p>
      <form
        onSubmit={handleSubmit}
        className="w-100"
        style={{ maxWidth: "400px" }}
      >
        {error && (
          <div
            className={`alert alert-danger position-fixed top-0 start-50 translate-middle-x mt-3 z-3 fade fs-7 ${
              showError ? "show" : ""
            }`}
            role="alert"
          >
            {error}
          </div>
        )}
        <div className="floating-label mb-4">
          <input
            type="email"
            className="form-control thin-input"
            id="studentEmail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            placeholder=" "
          />
          <label htmlFor="studentEmail">WVSU Email address</label>
        </div>
        <div className="floating-label mb-2">
          <input
            type="password"
            className="form-control thin-input"
            id="studentPassword"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            placeholder=" "
          />
          <label htmlFor="studentPassword">Password</label>
        </div>
        <p className="text-end fs-7">
          <Link
            href="/forgot-password?type=student"
            className="text-secondary opacity-75 text-decoration-none"
          >
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
          <p className="fs-7 text-secondary mt-2 mb-4 opacity-75">
            Don&apos;t have an account yet?{" "}
            <Link
              href="/student-signup"
              className="text-primary text-decoration-none"
            >
              Register Now
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}

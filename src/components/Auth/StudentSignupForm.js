"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function StudentSignupForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
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

    setTimeout(() => {
      setShowError(false);
      setTimeout(() => {
        setError("");
      }, 500);
    }, 3000);
  };

  const handleSubmitEmail = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/auth/student-signup/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        displayError(data.error || "Failed to initiate sign-up.");
      } else {
        setMessage(data.message);
        // Redirect to the verification/password setup page, passing email
        router.push(
          `/student-signup/verify?email=${encodeURIComponent(email)}`
        );
      }
    } catch (err) {
      console.error(err);
      displayError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-grow-1 d-flex flex-column align-items-center px-4 overflow-auto">
      <p className="my-4 text-secondary fs-6">Student Signup - Step 1</p>
      {error && (
        <div
          className={`fs-7 alert alert-danger position-fixed top-0 start-50 translate-middle-x mt-3 z-3 fade ${
            showError ? "show" : ""
          }`}
          role="alert"
        >
          {error}
        </div>
      )}
      <form
        onSubmit={handleSubmitEmail}
        className="w-100"
        style={{ maxWidth: "400px" }}
      >
        <div className="floating-label mb-4">
          <input
            type="email"
            className="form-control thin-input"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            placeholder=" "
          />
          <label htmlFor="email">Your WVSU Email (@wvsu.edu.ph)</label>
        </div>
        <hr className="border-1 border-secondary opacity-20 my-4"></hr>
        <div className="d-grid gap-2 pb-4">
          <button
            type="submit"
            className="btn btn-primary btn-lg fs-6 shadow-sm w-100"
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Send Verification Code"}
          </button>
          <Link
            href="/"
            className="btn custom-btn fs-6 btn-lg text-secondary border shadow-sm"
          >
            Back to Role Selection
          </Link>
          <p className="fs-7 text-secondary mt-2 mb-4 opacity-75">
            Already have an account?{" "}
            <Link
              href="/student-login"
              className="text-primary text-decoration-none"
            >
              Log In
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}

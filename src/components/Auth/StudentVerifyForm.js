"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showMessage, setShowMessage] = useState(false);
  const [error, setError] = useState("");
  const [showError, setShowError] = useState(false);

  // Effect to handle fade-out animation when error/message is set
  useEffect(() => {
    if (error) {
      setShowError(true);
    }
  }, [error]);

  useEffect(() => {
    if (message) {
      setShowMessage(true);
    }
  }, [message]);

  const displayError = (message) => {
    setError(message);

    setTimeout(() => {
      setShowError(false);
      setTimeout(() => {
        setError("");
      }, 500);
    }, 3000);
  };

  const displayMessage = (msg, redirectPath = null) => {
    setMessage(msg);

    setTimeout(() => {
      setShowMessage(false);

      setTimeout(() => {
        setMessage("");
        if (redirectPath) {
          router.push(redirectPath);
        }
      }, 500);
    }, 3000);
  };

  useEffect(() => {
    const emailFromQuery = searchParams.get("email");
    if (emailFromQuery) {
      setEmail(decodeURIComponent(emailFromQuery));
    } else {
      displayError("Email not found in URL. Please start over.");
    }
  }, [searchParams]);

  const handleSubmitVerification = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    setError("");

    if (!email) {
      displayError("Email is missing. Please restart the sign-up process.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/student-signup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password, confirmPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        displayError(data.error || "Failed to complete sign-up.");
      } else {
        displayMessage(data.message + " Redirecting to login...");
        setTimeout(() => {
          router.push("/student-login");
        }, 3000);
      }
    } catch (err) {
      console.error(err);
      displayError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!email && !error) {
    // If email not yet set from query and no initial error
    return <div className="text-center p-5">Loading email information...</div>;
  }

  return (
    <div className="flex-grow-1 d-flex flex-column align-items-center px-4 overflow-auto">
      <p className="mt-4 mb-0 text-secondary fs-6">Student Signup - step 2</p>
      <p className="mb-4text-center text-muted fs-7 opacity-75">
        A verification code was sent to{" "}
        <span className="text-primary">{email || "your email"}</span>.
      </p>
      {message && (
        <div
          className={`fs-7 alert alert-success position-fixed top-0 start-50 translate-middle-x mt-3 z-3 fade ${
            showMessage ? "show" : ""
          }`}
          role="alert"
        >
          {message}
        </div>
      )}{" "}
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
        onSubmit={handleSubmitVerification}
        className="w-100"
        style={{ maxWidth: "400px" }}
      >
        <div className="floating-label mt-2" style={{ marginBottom: "2rem" }}>
          <input
            type="text"
            className="form-control thin-input"
            id="token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
            disabled={isLoading}
            maxLength={6}
          />
          <label htmlFor="token">Verification Code (OTP)</label>
        </div>
        <div className="row">
          <div
            className="col-md-6 floating-label"
            style={{ marginBottom: "2rem" }}
          >
            <input
              type="password"
              className="form-control thin-input"
              id="password_signup"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
            <label htmlFor="password_signup" style={{ left: "1rem" }}>
              {" "}
              Set Password
            </label>
          </div>
          <div className="col-md-6 floating-label mb-1">
            <input
              type="password"
              className="form-control thin-input"
              id="confirmPassword_signup"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
            />
            <label htmlFor="confirmPassword_signup" style={{ left: "1rem" }}>
              {" "}
              Confirm Password
            </label>
          </div>
        </div>
        <hr className="border-1 border-secondary opacity-20 my-4"></hr>
        <div className="d-grid gap-2 pb-4">
          <button
            type="submit"
            className="btn btn-primary btn-lg fs-6 shadow-sm w-100"
            disabled={isLoading}
          >
            {isLoading ? "Verifying..." : "Complete Sign Up"}
          </button>
          <div>
            <p className="fs-7 text-secondary mt-2 mb-0 opacity-75">
              Already have an account?{" "}
              <Link
                href="/student-login"
                className="text-primary text-decoration-none"
              >
                Log In
              </Link>
            </p>
            <Link
              href="/student-signup"
              className="fs-7 text-secondary text-decoration-none mb-4 opacity-75"
            >
              Need to resend code or change email?
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}

// Wrapped in Suspense because useSearchParams needs it for client components in app router
export default function StudentVerifyForm() {
  return (
    <Suspense
      fallback={
        <div className="d-flex h-100 justify-content-center align-items-center">
          Loading...
        </div>
      }
    >
      <VerifyForm />
    </Suspense>
  );
}

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

    setTimeout(
      () => {
        setShowError(false);
        setTimeout(
          () => {
            setError("");
          },
          500);
      },
      3000
    );
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
      <h5 className="mb-4 text-primary">Student Sign Up - Step 2</h5>
      <p className="text-center text-muted fs-7">
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
        <div className="mb-3 text-start fs-7 text-secondary">
          <label htmlFor="token" className="form-label">
            Verification Code (OTP)
          </label>
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
        <div className="row">
          <div className="col-md-6 mb-3 text-start fs-7 text-secondary">
            <label htmlFor="password_signup" className="form-label">
              New Password
            </label>
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

          <div className="col-md-6 mb-3 text-start fs-7 text-secondary">
            <label htmlFor="confirmPassword_signup" className="form-label">
              Confirm New Password
            </label>
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
        </div>
        <p className="fs-7 text-secondary my-0">
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
          className="fs-7 text-secondary text-decoration-none"
        >
          Need to resend code or change email?
        </Link>
        <hr className="border-1 border-secondary opacity-20 my-4"></hr>
        <button
          type="submit"
          className="btn btn-primary btn-lg fs-6 shadow-sm w-100 mb-3"
          disabled={isLoading}
        >
          {isLoading ? "Verifying..." : "Complete Sign Up"}
        </button>
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

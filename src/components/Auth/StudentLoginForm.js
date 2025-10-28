"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation"; 
import Link from "next/link";

export default function StudentLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showError, setShowError] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams(); 

  
  useEffect(() => {
    const errorFromUrl = searchParams.get('error');
    if (errorFromUrl) {
      if (errorFromUrl === "CredentialsSignin") {
        displayError("Login failed. Please check your email and password.");
      } else {
        
        displayError(errorFromUrl); 
      }
      
      
    }
  }, [searchParams]);


  const displayError = (message) => {
    setError(message);
    setShowError(true);
    const timer = setTimeout(() => {
      setShowError(false);
      setTimeout(() => {
        setError("");
      }, 500); 
    }, 4000); 
    return () => clearTimeout(timer); 
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(""); 
    
    
    if (!email.toLowerCase().endsWith("@wvsu.edu.ph")) {
      displayError("Please use your official WVSU email address (@wvsu.edu.ph).");
      return; 
    }
    

    setIsLoading(true);

    try {
      
      
      const result = await signIn("student-credentials", {
        redirect: false, 
        email: email,
        password: password,
      });

      if (result?.error) {
        console.error("Sign-in error from NextAuth:", result.error);
        
        
        switch (result.error) {
          case "CredentialsSignin":
            
            displayError("The email address provided is not registered.");
            break;
          case "Incorrect password provided for this account.":
            
            displayError("Login failed. Please check your password.");
            break;
          
          case "Account not fully set up. Please complete the sign-up process or check your email for verification.":
          case "Email not verified. Please check your email for a verification link/code or restart sign-up.":
            displayError(result.error); 
            break;
          default:
            
            displayError("An unexpected login error occurred.");
            break;
        }      } else if (result?.ok) {
        console.log("Student sign-in successful");
        router.push("/dashboard");
      } else {
        displayError("An unexpected error occurred during login.");
      }

    } catch (err) {
      console.error("Login submission error:", err);
      displayError("A network error occurred. Please try again.");
    } finally {
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
        noValidate 
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

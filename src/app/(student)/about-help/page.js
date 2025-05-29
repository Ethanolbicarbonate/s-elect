"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";

const logoPublicPath = "/assets/sELECTLogo.svg";
const placeholderLogo =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext x="50" y="50" font-size="40" text-anchor="middle" dy=".3em"%3EELECT%3C/text%3E%3C/svg%3E';

export default function AboutPage() {
  const { data: session, status: sessionStatus } = useSession(); // Get session
  const studentEmail = session?.user?.email; // Get student email
  const projectTeam = [
    {
      name: "Carbonell, Ethan Jed",
      role: "Lead Developer, Designer, QA, Tester",
    },
    {
      name: "Corpes, Vincent Jr.",
      role: "Frontend Developer, Lead Designer, QA, Tester",
    },
    {
      name: "Junsay, Myrrhea Belle",
      role: "Backend Developer, Technical Writer, QA, Tester",
    },
    {
      name: "Montenegro, Karlo Roel",
      role: "Frontend Developer, Technical Writer, QA, Tester",
    },
    { name: "Ramiro, Kyla Elijah", role: "Project Manager, QA, Tester" },
    {
      name: "Sionosa, Meagelleine Rose",
      role: "Backend Developer, Database Admin, QA, Tester",
    },
  ];

  const votingSteps = [
    {
      step: 1,
      text: "Secure Login: Access the sELECT platform using your provided student credentials to ensure secure authentication.",
    },
    {
      step: 2,
      text: "Election Overview: Upon logging in, view the active election details on your dashboard, including the voting period and available positions.",
    },
    {
      step: 3,
      text: "Review Candidates: Navigate to the voting section. Review the list of partylists and candidates for each position.",
    },
    {
      step: 4,
      text: "Make Selections: Follow the step-by-step voting panel. Select your preferred candidates for each position, adhering to the maximum and minimum vote requirements (if applicable).",
    },
    {
      step: 5,
      text: "Review Your Ballot: Before submitting, carefully review your selected candidates to ensure your choices are accurate.",
    },
    {
      step: 6,
      text: "Submit Vote: Once you are satisfied with your selections, submit your ballot. You will receive a confirmation.",
    },
    {
      step: 7,
      text: "View Turnout (Optional): After voting, you may be able to view updated voter turnout data.",
    },
  ];

  const faqs = [
    {
      question: "Who is eligible to vote?",
      answer:
        "Eligibility is determined by the university based on enrollment status. If you have access to the platform with your student credentials, you are likely eligible to vote in the relevant elections.",
    },
    {
      question: "How is my vote kept secret?",
      answer:
        "The sELECT platform is designed with secure user authentication and employs measures to ensure the anonymity of your vote once submitted. Your individual ballot is separated from your identity after submission.",
    },
    {
      question: "Can I change my vote after submitting?",
      answer:
        "No, typically in electoral systems, once your vote is cast and confirmed, it cannot be changed or retracted.",
    },
    {
      question: "What should I do if I encounter a technical issue?",
      answer:
        "If you experience any technical problems while using the platform, please report the issue via the 'Contact & Support' section below or email support@s-elect.app directly, providing as much detail as possible.",
    },
    {
      question: "How are winners determined?",
      answer:
        "Winners for each position are determined based on the number of votes received, according to the maximum number of winners allowed per position.",
    },
    {
      question: "When will election results be available?",
      answer:
        "Results will be displayed on the platform's dashboard once the election period has concluded and the final tally has been completed by the electoral committee.",
    },
    {
      question: "What devices can I use to vote?",
      answer:
        "sELECT is a web-based platform designed to be mobile-responsive, meaning you can access and use it on various devices including desktops, laptops, tablets, and smartphones via a web browser.",
    },
  ];

  const supportEmail = "support@s-elect.app";

  // --- Feedback Form State ---
  const [feedbackContent, setFeedbackContent] = useState("");
  // Optional: Add state for feedback title if needed (and its input field below)
  // const [feedbackTitle, setFeedbackTitle] = useState("");
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState(null); // 'success' or 'danger'
  const [feedbackMessage, setFeedbackMessage] = useState("");

  // --- Handle Text Area Change ---
  const handleFeedbackChange = (e) => {
    setFeedbackContent(e.target.value);
    // Clear status/message when user starts typing again
    if (feedbackStatus) {
      setFeedbackStatus(null);
      setFeedbackMessage("");
    }
  };

  // Optional: Handle title change if you add a title input
  // const handleTitleChange = (e) => {
  //   setFeedbackTitle(e.target.value);
  //   setFeedbackStatus(null);
  //   setFeedbackMessage("");
  // };

  // --- Handle Form Submission ---
  // Use useCallback as it's an event handler passed to the form
  const handleSendFeedback = useCallback(
    async (e) => {
      e.preventDefault(); // Prevent default form submission
      setFeedbackStatus(null);
      setFeedbackMessage("");

      const trimmedContent = feedbackContent.trim();
      // Optional: const trimmedTitle = feedbackTitle.trim();

      if (!trimmedContent) {
        setFeedbackStatus("danger");
        setFeedbackMessage("Feedback content cannot be empty.");
        return;
      }

      // Check if user is logged in (required by your backend API)
      // useSession status check is more reliable than just checking session object
      if (
        sessionStatus !== "authenticated" ||
        session?.user?.role !== "STUDENT"
      ) {
        // This condition should ideally align with the button/textarea disabled state logic
        setFeedbackStatus("danger");
        setFeedbackMessage(
          "You must be logged in as a student to submit feedback."
        );
        return;
      }
      // Optional: Check if session.user.email is also available if your backend requires it
      if (!session.user.email) {
        setFeedbackStatus("danger");
        setFeedbackMessage("Your session does not include an email address.");
        console.error("Session exists but email is missing.", session);
        return;
      }

      setIsSendingFeedback(true);

      try {
        const res = await fetch("/api/feedback", {
          // Call your backend API route
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: trimmedContent,
            // title: trimmedTitle || undefined, // Include optional title if implemented
          }),
        });

        const result = await res.json(); // API should return { message: '...' } or { error: '...' }

        if (!res.ok) {
          // API returned an error status (4xx or 5xx)
          setFeedbackStatus("danger");
          setFeedbackMessage(
            result.error || "Failed to send feedback due to an API error."
          );
          console.error("Feedback API Error Response:", result);
        } else {
          // API returned success status (200)
          setFeedbackStatus("success");
          setFeedbackMessage(result.message || "Feedback sent successfully!");
          setFeedbackContent(""); // Clear the textarea on success
          // setFeedbackTitle(""); // Clear title on success
        }
      } catch (error) {
        // Handle network errors or errors during response parsing
        setFeedbackStatus("danger");
        setFeedbackMessage("An unexpected error occurred. Please try again.");
        console.error("Network or unexpected error sending feedback:", error);
      } finally {
        setIsSendingFeedback(false);
      }
    },
    [feedbackContent, sessionStatus, session] // Dependencies for useCallback (add feedbackTitle if implemented)
  );

  // Determine if the submit button should be disabled
  const isSubmitDisabled =
    isSendingFeedback ||
    sessionStatus === "loading" ||
    sessionStatus !== "authenticated" ||
    !feedbackContent.trim();

  // Show login required message only if unauthenticated
  const showLoginRequiredMessage = sessionStatus === "unauthenticated";

  return (
    <div className="container py-4">
      <div className="row mb-4 align-items-center">
        <div className="col-md-auto text-center text-md-start mb-3 mb-md-0">
          <Image
            src={logoPublicPath}
            alt="sELECT Logo"
            width={150}
            height={50}
            style={{ objectFit: "contain" }}
            priority
            onError={(e) => {
              console.error("Failed to load logo image:", e.currentTarget.src);
              e.currentTarget.src = placeholderLogo;
              e.currentTarget.srcset = "";
              e.currentTarget.onerror = null;
            }}
          />
        </div>
        <div className="col-md text-center text-md-start">
          <h1 className="h3 mb-1 text-primary">About sELECT</h1>
          <p className="lead text-muted small">
            Your modern online evaluation and election platform.
          </p>
        </div>
      </div>

      {/* About the Project Section */}
      <div className="card shadow-sm mb-4 rounded-4 overflow-hidden">
        <div className="card-header bg-light py-3">
          <h6 className="h6 mb-0 fw-medium text-secondary">Project Overview</h6>
        </div>
        <div className="card-body">
          <p className="card-text text-muted small">
            sELECT (Software for Evaluation and Election) is a web-based
            platform developed for West Visayas State University students. It
            aims to provide a modern, intuitive, and mobile-responsive online
            voting experience, addressing the limitations of previous systems.
          </p>
          <p className="card-text text-muted small mb-0">
            Key features include secure user authentication, step-by-step
            voting, real-time vote tallying, dashboard access, and clear result
            visualization. The project emphasizes functionality, security, and
            user experience to ensure effective electoral participation.
          </p>
        </div>
      </div>

      {/* How to Vote Section */}
      <div className="card shadow-sm mb-4 rounded-4 overflow-hidden">
        <div className="card-header bg-light py-3">
          <h6 className="h6 mb-0 fw-medium text-secondary">How to Vote</h6>
        </div>
        <div className="card-body">
          <p className="card-text text-muted small mb-3">
            Follow these simple steps to cast your vote on sELECT:
          </p>
          <ul className="list-group list-group-flush">
            {votingSteps.map((step) => (
              <li
                key={step.step}
                className="list-group-item px-0 py-2 d-flex align-items-start"
              >
                <span
                  className="badge bg-primary rounded-pill me-3 flex-shrink-0"
                  style={{
                    width: "25px",
                    height: "25px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {step.step}
                </span>
                <p className="mb-0 text-muted small flex-grow-1">{step.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Frequently Asked Questions Section */}
      <div className="card shadow-sm mb-4 rounded-4 overflow-hidden">
        <div className="card-header bg-light py-3">
          <h6 className="h6 mb-0 fw-medium text-secondary">FAQs</h6>
        </div>
        <div className="card-body">
          <div className="accordion accordion-flush" id="faqAccordion">
            {faqs.map((faq, index) => (
              <div key={index} className="accordion-item">
                <h2 className="accordion-header" id={`heading${index}`}>
                  <button
                    className={`accordion-button ${
                      index === 0 ? "" : "collapsed"
                    }`}
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target={`#collapse${index}`}
                    aria-expanded={index === 0}
                    aria-controls={`collapse${index}`}
                  >
                    <span className="small fw-medium text-dark-emphasis">
                      {faq.question}
                    </span>
                  </button>
                </h2>
                <div
                  id={`collapse${index}`}
                  className={`accordion-collapse collapse ${
                    index === 0 ? "show" : ""
                  }`}
                  aria-labelledby={`heading${index}`}
                  data-bs-parent="#faqAccordion"
                >
                  <div className="accordion-body small text-muted">
                    {faq.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact & Support Section (Now includes the functional form) */}
      <div className="card shadow-sm mb-4 rounded-4 overflow-hidden">
        <div className="card-header bg-light py-3">
          <h6 className="h6 mb-0 fw-medium text-secondary">
            Contact & Support
          </h6>
        </div>
        <div className="card-body">
          <p className="card-text text-muted small">
            If you have questions, feedback, or need to report a technical
            issue, please contact the sELECT support team. Your feedback helps
            us improve the platform.
          </p>
          <p className="card-text text-muted small mb-3">
            For direct email support:{" "}
            <a
              href={`mailto:${supportEmail}`}
              className="fw-medium text-primary"
            >
              {supportEmail}
            </a>
          </p>

          {/* --- Feedback Form --- */}
          <form
            onSubmit={handleSendFeedback}
            className="d-flex flex-column h-100"
          >
            {" "}
            {/* Added flex column */}
            {/* Label and Textarea */}
            <div className="mb-3 flex-grow-1">
              {" "}
              {/* Make textarea container grow */}
              <label
                htmlFor="feedbackTextarea"
                className="form-label small text-secondary mb-2 ms-2"
              >
                Leave Feedback or Report an Issue
              </label>
              <textarea
                className="form-control form-control-sm h-100" // h-100 to fill container height
                id="feedbackTextarea"
                placeholder="Write your feedback or details about the issue here. Please include relevant details like your student ID and steps to reproduce issues if reporting a technical problem."
                value={feedbackContent}
                onChange={handleFeedbackChange}
                // FIX: Disable textarea while session is loading or sending
                disabled={isSendingFeedback || sessionStatus === "loading"}
                style={{ resize: "vertical", minHeight: "180px" }} // Allow only vertical resize
              ></textarea>
            </div>
            {/* Status/Message Area */}
            {/* Status message positioning might depend on the parent container */}
            {feedbackStatus && (
              <div
                className={`alert ${
                  feedbackStatus === "success"
                    ? "alert-success border-success"
                    : "alert-danger border-danger"
                } small py-2 mb-3 flex-shrink-0`}
                role="alert"
              >
                {feedbackMessage}
              </div>
            )}
            {/* Button and Login Required message */}
            <div className="d-flex justify-content-end align-items-center flex-shrink-0">
              {" "}
              {/* Flex to align items, prevent shrinking */}
              {sessionStatus === "unauthenticated" && ( // Use sessionStatus directly
                <p className="text-danger small mb-0 me-3">
                  {" "}
                  {/* me-3 for space before button */}
                  You must be logged in to send feedback.
                </p>
              )}
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                // FIX: Disable button while session is loading, or not authenticated, or content is empty
                disabled={
                  isSendingFeedback ||
                  sessionStatus === "loading" ||
                  sessionStatus !== "authenticated" ||
                  !feedbackContent.trim()
                }
              >
                {isSendingFeedback ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-1"
                      aria-hidden="true"
                    ></span>
                    Sending...
                  </>
                ) : (
                  <>Send Feedback</>
                )}
              </button>
            </div>
          </form>

          <p className="card-text text-muted small mt-3 mb-0">
            When reporting technical issues, including details like your student
            ID, the browser and device you are using, and specific steps to
            reproduce the problem are very helpful.
          </p>
        </div>
      </div>
      <div className="card shadow-sm mb-4 rounded-4 overflow-hidden">
        <div className="card-header bg-light py-3">
          <h6 className="h6 mb-0 fw-medium text-secondary">Project Team</h6>
        </div>
        <div className="card-body">
          <p className="card-text text-muted small mb-3">
            The sELECT platform was developed by a dedicated student team at
            West Visayas State University as a project.
          </p>
          <ul className="list-group list-group-flush small">
            {" "}
            {/* Removed text-muted from ul */}
            {projectTeam.map((member, index) => (
              <li
                key={index}
                className="list-group-item px-0 py-2 border-bottom d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center" // Flex column on mobile, row on md+
              >
                {/* Member Name - Always show, allow wrapping */}
                <span className="text-dark-emphasis fw-medium flex-grow-1 me-md-3 mb-1 mb-md-0">
                  {" "}
                  {/* mb-1 on mobile */}
                  {member.name}
                </span>

                {/* Member Role - Break role string, display roles */}
                <div className="text-muted small flex-shrink-0">
                  {" "}
                  {/* Ensure this doesn't shrink name */}
                  {/* FIX: Display roles properly, removing "QA, Tester" */}
                  {member.role
                    .replace(/, QA, Tester/g, "") // Remove the specific string
                    .split(",") // Split by comma
                    .map((role) => role.trim()) // Trim each role
                    .filter((role) => role) // Remove empty strings
                    .map((role, roleIndex) => (
                      <span
                        key={roleIndex}
                        className="badge fw-medium bg-secondary-subtle text-secondary-emphasis me-1"
                      >
                        {" "}
                        {/* Use badges for roles */}
                        {role}
                      </span>
                    ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="py-3"></div>
    </div>
  );
}

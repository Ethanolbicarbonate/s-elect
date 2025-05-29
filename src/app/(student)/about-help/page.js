"use client";

import FadeInSection from "@/components/UI/FadeInSection";
import Image from "next/image";

const logoPublicPath = "/assets/sELECTLogo.svg";
const placeholderLogo =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext x="50" y="50" font-size="40" text-anchor="middle" dy=".3em"%3EELECT%3C/text%3E%3C/svg%3E';

export default function AboutPage() {
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
      text: "Login: Access the sELECT platform using your provided student credentials to ensure authentication.",
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
        "If you experience any technical problems while using the platform, please report the issue via the 'Contact & Support' section below and email support@s-elect.app directly, providing as much detail as possible.",
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

  return (
    <FadeInSection>
    <div className="container p-0">
      <div className="row mb-4 align-items-center">
        <div className="col-md-auto text-center text-md-start mb-3 mb-md-0">
          <Image
            src={logoPublicPath}
            alt="sELECT Logo"
            width={70}
            height={70}
            className="logo-color"
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

      {/* Contact & Support Section*/}
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
          <p className="card-text text-muted small mt-3 mb-0">
            When reporting technical issues, including details like your student
            ID, the browser and device you are using, and specific steps to
            reproduce the problem are very helpful.
          </p>
        </div>
      </div>
      <div className="card shadow-sm m-0 p-0 rounded-4 overflow-hidden">
        <div className="card-header bg-light py-3">
          <h6 className="h6 mb-0 fw-medium text-secondary">Project Team</h6>
        </div>
        <div className="card-body">
          <p className="card-text text-muted small mb-3">
            The sELECT platform was developed by a dedicated student team at
            West Visayas State University as a project.
          </p>
          <ul className="list-group list-group-flush small">
            {projectTeam.map((member, index) => (
              <li
                key={index}
                className="list-group-item px-0 py-2 border-bottom d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center" // Flex column on mobile, row on md+
              >
                <span className="text-dark-emphasis fw-medium flex-grow-1 me-md-3 mb-1 mb-md-0">
                  {member.name}
                </span>

                {/* Member Role - Break role string, display roles */}
                <div className="text-muted small flex-shrink-0">
                  {member.role
                    .replace(/, QA, Tester/g, "")
                    .split(",")
                    .map((role) => role.trim())
                    .filter((role) => role)
                    .map((role, roleIndex) => (
                      <span
                        key={roleIndex}
                        className="badge fw-medium bg-secondary-subtle text-secondary-emphasis me-1"
                      >
                        {role}
                      </span>
                    ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
    </FadeInSection>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import VotingSection from "@/components/Voting/VotingSection";
import ReviewBallotSection from "@/components/Voting/ReviewBallotSection";
import CandidateDetailModal from "@/components/StudentView/CandidateDetailModal";
import ConfirmationModal from "@/components/UI/ConfirmationModal";
import FadeInSection from "@/components/UI/FadeInSection";

// Stepper component
const Stepper = ({ currentStep, steps }) => {
  return (
    <nav aria-label="Voting Steps" className="mb-4">
      <ol className="breadcrumb justify-content-center">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={`breadcrumb-item ${
              currentStep === step.id
                ? "active fw-medium text-primary"
                : "text-secondary opacity-75"
            } ${
              index < steps.findIndex((s) => s.id === currentStep)
                ? "text-success"
                : ""
            }`}
            aria-current={currentStep === step.id ? "page" : undefined}
          >
            {index < steps.findIndex((s) => s.id === currentStep) ? (
              <i className="bi bi-check-circle-fill me-1"></i>
            ) : null}
            {step.name}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default function VotePage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const ballotContentRef = useRef(null);

  const [electionData, setElectionData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasVotedInThisElection, setHasVotedInThisElection] = useState(null);

  const votingSteps = [
    { id: "WELCOME", name: "Welcome" },
    { id: "USC", name: "USC Ballot" },
    { id: "CSC", name: "CSC Ballot" },
    { id: "REVIEW", name: "Review & Confirm" },
  ];
  const [currentStep, setCurrentStep] = useState(votingSteps[0].id);

  const [uscSelections, setUscSelections] = useState({});
  const [cscSelections, setCscSelections] = useState({});

  const [showCandidateDetailModal, setShowCandidateDetailModal] =
    useState(false);
  const [selectedCandidateForDetail, setSelectedCandidateForDetail] =
    useState(null);
  const [showConfirmSubmitModal, setShowConfirmSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchElectionAndVoteStatus = useCallback(async () => {
    if (sessionStatus !== "authenticated" || !session?.user?.id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const electionRes = await fetch("/api/student/active-election-details");
      if (!electionRes.ok) {
        const errData = await electionRes
          .json()
          .catch(() => ({ error: "Failed to load election data." }));
        throw new Error(
          errData.error || `Election API Error: ${electionRes.status}`
        );
      }
      const data = await electionRes.json();

      if (!data || data.effectiveStatusForStudent !== "ONGOING") {
        setElectionData(data);
        setError(
          data
            ? "Voting for this election is not currently open."
            : "No active election found."
        );
        setCurrentStep("NO_ELECTION");
        setIsLoading(false);
        return;
      }
      setElectionData(data);

      const voteStatusRes = await fetch(
        `/api/student/vote-status?electionId=${data.id}`
      );
      if (!voteStatusRes.ok) {
        console.warn("Could not fetch specific vote status for this election.");
        setHasVotedInThisElection(false);
      } else {
        const voteStatusData = await voteStatusRes.json();
        setHasVotedInThisElection(voteStatusData.hasVoted);
      }

      if (hasVotedInThisElection) {
        setCurrentStep("ALREADY_VOTED");
      } else if (data.effectiveStatusForStudent === "ONGOING") {
        if (Object.keys(uscSelections).length === 0 && data.uscPositions) {
          const initialUsc = {};
          data.uscPositions.forEach((p) => (initialUsc[p.id] = new Set()));
          setUscSelections(initialUsc);
        }
        if (Object.keys(cscSelections).length === 0 && data.cscPositions) {
          const initialCsc = {};
          data.cscPositions.forEach((p) => (initialCsc[p.id] = new Set()));
          setCscSelections(initialCsc);
        }
        setCurrentStep("WELCOME");
      }
    } catch (err) {
      console.error("Error fetching election/vote status:", err);
      setError(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [sessionStatus, session?.user?.id, session?.user?.hasVoted]);

  useEffect(() => {
    fetchElectionAndVoteStatus();
  }, [fetchElectionAndVoteStatus]);

  const handleUpdateSelection = (scope, positionId, candidateId) => {
    const setSelections = scope === "USC" ? setUscSelections : setCscSelections;
    const selections = scope === "USC" ? uscSelections : cscSelections;
    const positionsForScope =
      scope === "USC" ? electionData?.uscPositions : electionData?.cscPositions;
    const position = positionsForScope?.find((p) => p.id === positionId);

    if (!position) return;

    setSelections((prevSelections) => {
      const newSelectionsForPosition = new Set(
        prevSelections[positionId] || []
      );
      if (newSelectionsForPosition.has(candidateId)) {
        newSelectionsForPosition.delete(candidateId);
      } else {
        if (position.maxVotesAllowed === 1) {
          newSelectionsForPosition.clear();
          newSelectionsForPosition.add(candidateId);
        } else if (newSelectionsForPosition.size < position.maxVotesAllowed) {
          newSelectionsForPosition.add(candidateId);
        } else {
          alert(
            `You can only select up to ${position.maxVotesAllowed} candidate(s) for ${position.name}.`
          );
          return prevSelections;
        }
      }
      return { ...prevSelections, [positionId]: newSelectionsForPosition };
    });
  };

  const handleShowCandidateDetails = (candidate) => {
    setSelectedCandidateForDetail(candidate);
    setShowCandidateDetailModal(true);
  };

  const proceedToStep = (stepId) => {
    setCurrentStep(stepId);
    // FIX: Scroll the specific ballot content ref to top
    if (ballotContentRef.current) {
      requestAnimationFrame(() => {
        // Using requestAnimationFrame for smoother scroll
        ballotContentRef.current.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      });
    } else {
      console.warn("Ballot content ref not found for scrolling.");
      // Fallback to window scroll if ref is somehow not attached, but this should be rare.
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmitBallot = async () => {
    setShowConfirmSubmitModal(false);
    setIsSubmitting(true);
    setError("");

    const ballotPayload = {
      electionId: electionData.id,
      uscSelections: {},
      cscSelections: {},
    };

    Object.entries(uscSelections).forEach(([posId, candSet]) => {
      ballotPayload.uscSelections[posId] = Array.from(candSet);
    });
    Object.entries(cscSelections).forEach(([posId, candSet]) => {
      ballotPayload.cscSelections[posId] = Array.from(candSet);
    });

    try {
      const res = await fetch("/api/student/submit-vote", {
        //API endpoint for submitting votes
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ballotPayload),
      });

      if (!res.ok) {
        const errData = await res
          .json()
          .catch(() => ({ error: "Vote submission failed." }));
        throw new Error(errData.error || `API Error: ${res.status}`);
      }
      //On successful submission
      router.push("/vote/submitted"); // Redirect to acknowledgement page
    } catch (err) {
      console.error("Error submitting ballot:", err);
      setError(err.message || "Failed to submit your vote. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sessionStatus === "loading" || isLoading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Preparing your ballot...</p>
      </div>
    );
  }

  if (sessionStatus === "unauthenticated") {
    return (
      <div className="container py-5 text-center">
        <p className="alert alert-warning">
          Please <Link href="/student-login">log in</Link> to access the voting
          page.
        </p>
      </div>
    );
  }

  if (currentStep === "NO_ELECTION" || !electionData) {
    return (
      <div className="container py-5 text-center">
        <div className="alert alert-info">
          <h4>
            <i className="bi bi-info-circle-fill me-2"></i>Election Information
          </h4>
          <p>
            {error ||
              "No election is currently active or available for voting."}
          </p>
          <Link href="/dashboard" className="btn btn-sm btn-primary">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (currentStep === "ALREADY_VOTED" || hasVotedInThisElection === true) {
    return (
      <div className="container py-5 text-center">
        <div className="alert alert-success">
          <h4 className="fw-normal">
            <i className="bi bi-check-circle-fill me-2"></i>Vote Cast!
          </h4>
          <p>
            You have already cast your vote for the election:{" "}
            <span className="fw-medium">{electionData?.name}</span>.
          </p>
          <p>Thank you for participating!</p>
          <Link
            href="/dashboard"
            className="btn btn-sm btn-outline-success me-2"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Derived states for child components
  const currentScopeData =
    currentStep === "USC"
      ? {
          positions: electionData.uscPositions || [],
          candidates: electionData.uscCandidates || [], // API returns candidates with position and partylist info
          partylists: electionData.uscPartylists || [],
          selections: uscSelections,
          title: "University Student Council (USC) Ballot",
        }
      : currentStep === "CSC"
      ? {
          positions: electionData.cscPositions || [],
          candidates: electionData.cscCandidates || [],
          partylists: electionData.cscPartylists || [],
          selections: cscSelections,
          title: `College Student Council (${session.user.college}) Ballot`,
        }
      : null;

  return (
    <FadeInSection>
      <div className="container m-0 p-0">
        <div className="card shadow-lg border rounded-4">
          <div className="card-header bg-primary text-white text-center py-3 rounded-top-4 border-bottom-0">
            <h2 className="h4 mb-0">
              {electionData?.name || "Student Election"}
            </h2>
          </div>
          <div
            className="card-body p-md-4 p-lg-5"
            ref={ballotContentRef}
            style={{
              maxHeight: "calc(100vh - 170px)",
              overflowY: "auto",
            }}
          >
            <Stepper currentStep={currentStep} steps={votingSteps} />
            <hr className="mb-4" />
            {error && <div className="alert alert-danger">{error}</div>}
            {currentStep === "WELCOME" && (
              <div className="text-center p-lg-5">
                <h3 className="mb-3">Welcome, {session.user.firstName}!</h3>
                <p className="lead">
                  You are about to cast your vote for the{" "}
                  <strong>{electionData.name}</strong>.
                </p>
                <p>
                  Please review candidates carefully. You will be able to review
                  all your selections before final submission.
                </p>
                <p className="small text-muted">
                  Election Period:{" "}
                  {new Date(electionData.startDate).toLocaleDateString()} -{" "}
                  {new Date(
                    electionData.effectiveEndDateForStudent
                  ).toLocaleDateString()}
                </p>
                <button
                  className="btn btn-lg btn-success mt-4"
                  onClick={() => proceedToStep("USC")}
                >
                  Start Voting{" "}
                  <i className="bi bi-arrow-right-circle-fill ms-2"></i>
                </button>
              </div>
            )}
            {(currentStep === "USC" || currentStep === "CSC") &&
              currentScopeData && (
                <VotingSection
                  key={currentStep}
                  scopeTitle={currentScopeData.title}
                  positions={currentScopeData.positions}
                  candidates={currentScopeData.candidates} // Pass all candidates for this scope
                  currentSelections={currentScopeData.selections}
                  onUpdateSelection={(posId, candId) =>
                    handleUpdateSelection(currentStep, posId, candId)
                  }
                  onViewCandidateDetails={handleShowCandidateDetails}
                />
              )}
            {currentStep === "USC" && (
              <div className="text-end mt-4">
                <button
                  className="btn btn-primary btn-lg"
                  onClick={() => proceedToStep("CSC")}
                >
                  Next: {session.user.college} CSC Ballot{" "}
                  <i className="bi bi-arrow-right"></i>
                </button>
              </div>
            )}
            {currentStep === "CSC" && (
              <div className="d-flex flex-column flex-md-row justify-content-between mt-4 gap-2">
                <button
                  className="btn custom-btn fs-5 btn-lg text-secondary border"
                  onClick={() => proceedToStep("USC")}
                >
                  <i className="bi bi-arrow-left"></i> Back to USC Ballot
                </button>
                <button
                  className="btn btn-primary btn-lg fs-5"
                  onClick={() => proceedToStep("REVIEW")}
                >
                  Review My Ballot <i className="bi bi-arrow-right"></i>
                </button>
              </div>
            )}
            {currentStep === "REVIEW" && electionData && (
              <ReviewBallotSection
                uscSelections={uscSelections}
                cscSelections={cscSelections}
                electionData={electionData} // Pass full electionData for names, etc.
                studentCollegeName={session.user.college}
                onEditUSC={() => proceedToStep("USC")}
                onEditCSC={() => proceedToStep("CSC")}
                onSubmit={() => setShowConfirmSubmitModal(true)}
              />
            )}
          </div>
        </div>

        {selectedCandidateForDetail && (
          <CandidateDetailModal
            show={showCandidateDetailModal}
            onClose={() => setShowCandidateDetailModal(false)}
            candidate={selectedCandidateForDetail}
          />
        )}

        <ConfirmationModal
          show={showConfirmSubmitModal}
          onClose={() => setShowConfirmSubmitModal(false)}
          onConfirm={handleSubmitBallot}
          title="Confirm Your Vote Submission"
          bodyText="Are you sure you want to cast your vote? Once submitted, your choices cannot be changed."
          confirmButtonText="Yes, Cast My Vote"
          cancelButtonText="Cancel"
          isConfirming={isSubmitting}
        />
      </div>
    </FadeInSection>
  );
}

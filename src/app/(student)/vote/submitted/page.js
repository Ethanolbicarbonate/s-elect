import FadeInSection from '@/components/UI/FadeInSection';
import Link from 'next/link';

export default async function VoteSubmittedPage() {

  return (
    <FadeInSection>
    <div className="container py-5 text-center">
      <div className="card shadow-lg border-0 mx-auto rounded-4" style={{ maxWidth: '600px' }}>
        <div className="card-body p-4 p-md-5">
          <div className="mb-4">
            <i className="bi bi-patch-check-fill display-1 text-success"></i>
          </div>
          <h2 className="card-title h3 mb-3 text-success">Vote Submitted Successfully!</h2>
          <p className="card-text lead text-muted">
            Thank you for participating in the election. Your voice matters.
          </p>
          <hr className="my-4" />
          <p className="text-muted small">
            Your ballot has been securely recorded. Results will be announced after the election period concludes and votes are tallied. Please refer to official announcements for details.
          </p>

          <div className="mt-4 pt-2">
            <Link href="/dashboard" className="btn btn-primary btn-lg px-4 me-2 mb-2">
              <i className="bi bi-house-door-fill me-2"></i>Go to Dashboard
            </Link>
            <Link href="/" className="btn custom-btn border text-secondary btn-lg px-4 mb-2">
              <i className="bi bi-arrow-left-circle me-2"></i>Back to Home
            </Link>
          </div>
        </div>
        <div className="card-footer border-top-0 text-muted small py-3 bg-light border-top-0 rounded-bottom-4">
          sELECT - University Student Voting System
        </div>
      </div>
    </div>
    </FadeInSection>
  );
}
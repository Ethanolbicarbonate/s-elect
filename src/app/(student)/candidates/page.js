import Image from "next/image";
import Link from "next/link";

export default function CandidatesPage() {
  // Sample Data (replace with dynamic data later)
  const uscPartyLists = [
    {
      name: "Kinse Macalalag",
      slogan: "Sparking Change, Leading with Vision!",
      candidates: [
        { name: "Vincent Bombardino", position: "Chairperson" }, // Will use image
        { name: "Myrrhea Belle Capuccina", position: "Vice Chairperson" }, // No photoUrl, will use icon
        { name: "Jap Jap Jap Sahur", position: "Councilor", photoUrl: "" }, // Empty photoUrl, will use icon
        { name: "Kylarili Larila", position: "Councilor", photoUrl: "" }, // Empty photoUrl, will use icon
      ],
    },
    {
      name: "Neighborhoods",
      slogan: "Together we defeat the DARKNESS!",
      candidates: [
        { name: "Dallas Supper", position: "Chairperson" }, // Will use image
        { name: "Frederico Assasino", position: "Vice Chairperson" }, // No photoUrl, will use icon
        { name: "Julliarili Larila", position: "Councilor", photoUrl: "" }, // Empty photoUrl, will use icon
      ],
    },
  ];

  const studentCollege = "CICT"; // Assume student's college is 'CICT'
  const cscPartyLists = [
    {
      college: "CICT",
      name: "Tech Innovators League",
      slogan: "Coding the Future of CICT!",
      candidates: [
        { name: "Kinkiringking", position: "Chairperson" }, // Will use image
        { name: "Rose ", position: "Vice Chairperson" }, // No photoUrl, will use icon
        { name: "Julliarili Larila", position: "Councilor", photoUrl: "" }, // Empty photoUrl, will use icon
      ],
    },
    {
      college: "COE",
      name: "Educators for Excellence (COE)",
      logoUrl: "/assets/partylists/coe-excellence-logo.png",
      slogan: "Inspiring Minds, Shaping Futures!",
      candidates: [{ name: "David Lee", position: "Governor (COE)" }],
    },
  ];

  const relevantCscPartyLists = cscPartyLists.filter(
    (pl) => pl.college === studentCollege
  );

  const renderCandidateCard = (candidate, keyPrefix) => (
    <div
      className="col-md-6 col-lg-4 col-xl-3"
      key={`${keyPrefix}-${candidate.name}`}
    >
      <div className="card h-100 text-center shadow-sm border-light">
        {" "}
        {/* Added border-light */}
        <div className="pt-3">
          {" "}
          {/* Added padding top for the image/icon container */}
          {candidate.photoUrl ? (
            <Image
              src={candidate.photoUrl}
              alt={candidate.name}
              width={100} // Adjusted size
              height={100} // Adjusted size
              className="rounded-circle mx-auto shadow-sm"
              style={{ objectFit: "cover", border: "2px solid #eee" }} // Added a subtle border
            />
          ) : (
            <div
              className="d-flex align-items-center justify-content-center rounded-circle bg-secondary mx-auto text-white shadow-sm"
              style={{
                width: "100px",
                height: "100px",
                border: "2px solid #eee",
              }} // Matched size and border
            >
              <i className="bi bi-person-fill" style={{ fontSize: "3rem" }}></i>{" "}
              {/* Bootstrap Icon */}
            </div>
          )}
        </div>
        <div className="card-body pt-2">
          {" "}
          {/* Reduced top padding for card body */}
          <h6 className="card-subtitle mb-1 fw-bold text-dark">
            {candidate.name}
          </h6>
          <p className="card-text text-muted small mb-0">
            {candidate.position}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 text-dark">Party Lists</h1>
      </div>

      {/* USC Party Lists Section */}
      <section className="mb-5">
        <h2 className="h4 text-primary mb-3">
          University Student Council (USC) Party Lists
        </h2>
        {uscPartyLists.length > 0 ? (
          uscPartyLists.map((party, index) => (
            <div
              className="card shadow-sm border-0 mb-4"
              key={`usc-party-${index}`}
            >
              <div className="card-header bg-primary-soft d-flex align-items-center py-3">
                {party.logoUrl ? (
                  <Image
                    src={party.logoUrl}
                    alt={`${party.name} Logo`}
                    width={45}
                    height={45}
                    className="rounded me-3"
                  />
                ) : (
                  <div
                    className="d-flex align-items-center justify-content-center rounded bg-light me-3"
                    style={{ width: "45px", height: "45px" }}
                  >
                    <i
                      className="bi bi-flag-fill text-primary"
                      style={{ fontSize: "1.5rem" }}
                    ></i>{" "}
                    {/* Placeholder for party logo */}
                  </div>
                )}
                <div>
                  <h5 className="card-title mb-0 text-primary fw-bold">
                    {party.name}
                  </h5>
                  {party.slogan && (
                    <p className="mb-0 text-muted small fst-italic">
                      &quot;{party.slogan}&quot;
                    </p>
                  )}
                </div>
              </div>
              <div className="card-body">
                <h6 className="text-secondary mb-3">Candidates:</h6>
                {party.candidates.length > 0 ? (
                  <div className="row g-3">
                    {party.candidates.map((candidate) =>
                      renderCandidateCard(candidate, `usc-${party.name}`)
                    )}
                  </div>
                ) : (
                  <p className="text-muted">
                    No candidates listed for this party yet.
                  </p>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="card shadow-sm border-0">
            <div className="card-body text-center text-muted p-5">
              <i
                className="bi bi-exclamation-triangle"
                style={{ fontSize: "3rem" }}
              ></i>
              <p className="mt-2">
                No USC party lists are currently available.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* CSC Party Lists Section */}
      <section>
        <h2 className="h4 text-primary mb-3">
          College Student Council (CSC) Party Lists - {studentCollege}
        </h2>
        {relevantCscPartyLists.length > 0 ? (
          relevantCscPartyLists.map((party, index) => (
            <div
              className="card shadow-sm border-0 mb-4"
              key={`csc-party-${index}`}
            >
              <div className="card-header bg-info-soft d-flex align-items-center py-3">
                {party.logoUrl ? (
                  <Image
                    src={party.logoUrl}
                    alt={`${party.name} Logo`}
                    width={45}
                    height={45}
                    className="rounded me-3"
                  />
                ) : (
                  <div
                    className="d-flex align-items-center justify-content-center rounded bg-light me-3"
                    style={{ width: "45px", height: "45px" }}
                  >
                    <i
                      className="bi bi-flag-fill text-info"
                      style={{ fontSize: "1.5rem" }}
                    ></i>{" "}
                    {/* Placeholder for party logo */}
                  </div>
                )}
                <div>
                  <h5 className="card-title mb-0 text-info fw-bold">
                    {party.name}
                  </h5>
                  {party.slogan && (
                    <p className="mb-0 text-muted small fst-italic">
                      &quot;{party.slogan}&quot;
                    </p>
                  )}
                </div>
              </div>
              <div className="card-body">
                <h6 className="text-secondary mb-3">Candidates:</h6>
                {party.candidates.length > 0 ? (
                  <div className="row g-3">
                    {party.candidates.map((candidate) =>
                      renderCandidateCard(candidate, `csc-${party.name}`)
                    )}
                  </div>
                ) : (
                  <p className="text-muted">
                    No candidates listed for this party yet.
                  </p>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="card shadow-sm border-0">
            <div className="card-body text-center text-muted p-5">
              <i
                className="bi bi-exclamation-triangle"
                style={{ fontSize: "3rem" }}
              ></i>
              <p className="mt-2">
                No CSC party lists are currently available for your college (
                {studentCollege}).
              </p>
            </div>
          </div>
        )}
      </section>
      {/* Ensure soft background styles are in global.css or add 'use client' to this file */}
      {/* Example:
      <style jsx global>{`
        .bg-primary-soft { background-color: rgba(13, 110, 253, 0.1); }
        .bg-info-soft { background-color: rgba(13, 202, 240, 0.1); }
        .card-header { border-bottom: 0; }
      `}</style>
      */}
    </div>
  );
}

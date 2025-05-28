"use client";

import Image from "next/image";

export default function WinnersOverview({ positionsResults }) {
  const winnersToDisplay = [];

  positionsResults.forEach((position) => {
    const winners = position.candidates.filter((c) => c.isWinner);

    if (winners.length > 0) {
      winners.forEach((winner) => {
        winnersToDisplay.push({
          ...winner,
          positionName: position.name,
          positionType: position.type,
          positionCollege: position.college,
          positionOrder: position.order,
        });
      });
    }
  });

  if (winnersToDisplay.length === 0) {
    return (
      <div className="text-center text-muted small p-3">
        No winners declared for this scope yet.
      </div>
    );
  }

  return (
    <div className="list-group list-group-flush">
      {winnersToDisplay.map((winner) => (
        <div
          key={winner.id}
          className="list-group-item d-flex align-items-center py-2 px-0 border-0"
        >
          {/* Winner Photo */}
          <div
            className="flex-shrink-0 me-3 rounded-circle"
            style={{
              width: "40px",
              height: "40px",
              overflow: "hidden",
              position: "relative",
              border: "1px solid #ddd",
              backgroundColor: "#f8f9fa",
            }}
          >
            {winner.photoUrl ? (
              <Image
                src={winner.photoUrl}
                alt={`${winner.firstName} Photo`}
                fill
                style={{ objectFit: "cover" }}
                sizes="40px"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="d-flex align-items-center justify-content-center w-100 h-100">
                <i className="bi bi-person-fill fs-5 text-secondary opacity-50"></i>
              </div>
            )}
          </div>
          {/* Winner Name and Position */}
          <div className="flex-grow-1">
            <h6 className="mb-0 fw-medium small text-dark-emphasis">
              {winner.firstName} {winner.lastName}
              {winner.nickname && ` (${winner.nickname})`}
            </h6>
            <p className="mb-0 text-secondary fs-7">
              {winner.positionName}
              {winner.partylist && !winner.isIndependent && (
                <span className="ms-1">
                  ({winner.partylist.acronym || winner.partylist.name})
                </span>
              )}
              {winner.isIndependent && (
                <span className="ms-1">(Independent)</span>
              )}
            </p>
          </div>
          {/* Trophy Icon */}
          <div className="flex-shrink-0 ms-auto">
            <i className="bi bi-award-fill text-warning fs-5"></i>
          </div>
        </div>
      ))}
    </div>
  );
}

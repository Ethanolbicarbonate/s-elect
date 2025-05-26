// src/components/StudentView/ScrollableCandidateRow.js
"use client";

import { useRef, useState, useEffect } from "react";
import CandidateCard from "./CandidateCard";

export default function ScrollableCandidateRow({ candidates, positionName, onViewDetails }) {
  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const cardWidthEstimate = 260; // Estimate width of a card + margin for scroll amount (adjust as needed)

  const checkScrollability = () => {
    const container = scrollContainerRef.current;
    if (container) {
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth -1); // -1 for precision
    }
  };

  useEffect(() => {
    // Check initially and on resize/candidate change
    checkScrollability();
    window.addEventListener('resize', checkScrollability);
    return () => window.removeEventListener('resize', checkScrollability);
  }, [candidates]); // Re-check if candidates change, as scrollWidth might change

  const handleScroll = (direction) => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = direction === 'left' ? -cardWidthEstimate * 2 : cardWidthEstimate * 2; // Scroll by 2 cards
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      // Check scrollability again after a short delay to allow scroll to complete
      setTimeout(checkScrollability, 350); // Corresponds to smooth scroll duration
    }
  };

  if (!candidates || candidates.length === 0) {
    // This case should ideally be handled by parent, but good to have a fallback
    return (
      <div className="col-12">
        <p className="text-muted fst-italic">
          No candidates currently listed for {positionName} under the active filters.
        </p>
      </div>
    );
  }

  return (
    <div className="position-relative"> {/* For absolute positioning of buttons */}
      {canScrollLeft && (
        <button
          className="btn btn-outline-secondary btn-sm position-absolute top-50 start-0 translate-middle-y z-1"
          onClick={() => handleScroll('left')}
          title="Previous Candidates"
          style={{ marginLeft: '-15px' }} // Adjust for visual appeal
        >
          <i className="bi bi-chevron-left"></i>
        </button>
      )}
      
      <div 
        ref={scrollContainerRef}
        className="d-flex flex-nowrap overflow-auto py-2" // Use overflow-auto for native scrollbar if buttons are not enough/desired
        onScroll={checkScrollability} // Update button states on manual scroll
        style={{ 
            // overflowX: 'hidden', // if you want to HIDE the scrollbar and only use buttons
            // whiteSpace: 'nowrap', // Not strictly needed with flex-nowrap but good practice for inline-block children
            scrollBehavior: 'smooth',
            paddingLeft: '10px', // Space for left button if overlapping
            paddingRight: '10px', // Space for right button if overlapping
        }}
      >
        {candidates.map((candidate) => (
          <div key={candidate.id} className="me-3" style={{ flex: '0 0 auto', width: `${cardWidthEstimate - 20}px` /* Ensure cards don't shrink too much */ }}> 
            {/* width helps with consistent item size for scrolling calculations */}
            <CandidateCard
              candidate={candidate}
              onViewDetails={() => onViewDetails(candidate)}
            />
          </div>
        ))}
      </div>

      {canScrollRight && (
        <button
          className="btn btn-outline-secondary btn-sm position-absolute top-50 end-0 translate-middle-y z-1"
          onClick={() => handleScroll('right')}
          title="Next Candidates"
          style={{ marginRight: '-15px' }} // Adjust
        >
          <i className="bi bi-chevron-right"></i>
        </button>
      )}
    </div>
  );
}
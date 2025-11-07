// File: .\components\UI\FloatingVoteButton.js

"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Helper function to calculate time remaining
const calculateTimeLeft = (endDate) => {
  const difference = +new Date(endDate) - +new Date();
  let timeLeft = {};

  if (difference > 0) {
    timeLeft = {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }
  return timeLeft;
};

export default function FloatingVoteButton({ electionStatus, hasVoted, electionEndDate, currentPath }) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(electionEndDate));

  useEffect(() => {
    // Set up an interval to update the timer every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(electionEndDate));
    }, 1000);

    // Clean up the interval on component unmount
    return () => clearInterval(timer);
  }, [electionEndDate]);

  // Determine if the button should be visible
  const isVisible = 
    electionStatus === 'ONGOING' && 
    hasVoted === false && 
    !currentPath.startsWith('/vote');

  if (!isVisible) {
    return null;
  }

  // Format the time left into a string
  const timerComponents = [];
  if (timeLeft.days > 0) timerComponents.push(`${timeLeft.days}d`);
  if (timeLeft.hours > 0) timerComponents.push(`${timeLeft.hours}h`);
  if (timeLeft.minutes > 0) timerComponents.push(`${timeLeft.minutes}m`);
  // Always show seconds for a sense of urgency
  timerComponents.push(`${timeLeft.seconds || 0}s`);
  const timerString = timerComponents.join(' ');

  const handleVoteClick = () => {
    router.push('/vote');
  };

  return (
    <>
      <div className="floating-vote-container">
        <button 
          className="btn btn-danger shadow-lg d-flex align-items-center enhanced-vote-btn"
          onClick={handleVoteClick}
        >
          {/* Changed icon to be more of a "call to action" */}
          <i className="bi bi-megaphone-fill me-3"></i>
          <div>
            <div className="vote-now-text">VOTE NOW</div>
            <div className="timer">{timerString} left</div>
          </div>
        </button>
      </div>

      <style jsx>{`
        .floating-vote-container {
          position: fixed;
          bottom: 180px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1020;
          /* Ensure the container is a positioning context for the pseudo-element */
          display: flex; 
          justify-content: center;
          align-items: center;
        }

        .enhanced-vote-btn {
        position: relative;
          /* Made button bigger and pill-shaped */
          padding: 1rem 2rem; 
          border-radius: 50px;
          border: none;
          
          /* Added a subtle gradient for depth */
          background-image: linear-gradient(to right, #dc3545, #c82333);
          
          /* Added a more noticeable pulse animation */
          animation: pulse-animation 1.5s infinite;
          transition: transform 0.2s ease-in-out;
        }

        .enhanced-vote-btn:hover {
          transform: scale(1.05); /* Grow slightly on hover */
        }

        /* Made icon larger */
        .enhanced-vote-btn i {
          font-size: 1.8rem;
        }

        /* Made text bigger and bolder */
        .vote-now-text {
          font-size: 1.2rem;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
        }

        .timer {
          font-size: 0.8rem; /* Slightly larger timer */
          font-weight: normal;
          line-height: 1;
          opacity: 0.9;
        }

        /* Enhanced pulse with scaling */
        @keyframes pulse-animation {
          0% {
            transform: scale(1.53);
            box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7);
          }
          10% {
            transform: scale(1.33);
            box-shadow: 0 0 0 15px rgba(220, 53, 69, 0);
          }
          20% {
            transform: scale(1.38);
            box-shadow: 0 0 0 0 rgba(220, 53, 69, 0);
          }
          30% {
            transform: scale(1.33);
            box-shadow: 0 0 0 15px rgba(220, 53, 69, 0);
          }
        40% {
            transform: scale(1.5);
            box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7);
          }
        100% {
            transform: scale(1.5);
            box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7);
          }
        }

        /* Responsive adjustments for smaller screens */
        @media (max-width: 576px) {
          .floating-vote-container {
          position: fixed;
          bottom: 150px; /* Moved up slightly */
          left: 50%;
          transform: translateX(-50%);
          z-index: 1040;
            }
          .enhanced-vote-btn {
            padding: 1rem 2rem;
          }
          .vote-now-text {
            font-size: 1rem;
          }
          .enhanced-vote-btn i {
            font-size: 1.5rem;
          }
          .timer {
            font-size: 0.7rem;
          }
        }
      `}</style>
    </>
  );
}
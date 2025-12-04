"use client";

import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

export default function ElectionCalendarWidget({ electionPeriod = null }) {
  const [activeMonth, setActiveMonth] = useState(new Date());

  useEffect(() => {
    // If a specific election period is provided, set the calendar to its start month
    if (electionPeriod && electionPeriod.startDate) {
      const eventStartDate = new Date(electionPeriod.startDate);
      setActiveMonth(
        new Date(eventStartDate.getFullYear(), eventStartDate.getMonth(), 1)
      );
    } else {
      // If no specific election period, default to the current month
      const now = new Date();
      setActiveMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    }
  }, [electionPeriod]); // Update when the electionPeriod prop changes

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today's date for comparison

  const handleActiveStartDateChange = ({ activeStartDate }) => {
    setActiveMonth(activeStartDate);
  };

  // tileContent and tileClassName now work with a single electionPeriod
  const tileContent = ({ date, view }) => {
    if (view === "month" && electionPeriod) {
      const currentDate = new Date(date);
      currentDate.setHours(0, 0, 0, 0);

      const eventStartDate = new Date(electionPeriod.startDate);
      eventStartDate.setHours(0, 0, 0, 0);
      const eventEndDate = new Date(electionPeriod.endDate); // Already the effective end date
      eventEndDate.setHours(0, 0, 0, 0);

      const isVotingDay =
        currentDate.getTime() >= eventStartDate.getTime() &&
        currentDate.getTime() <= eventEndDate.getTime();

      const isToday = currentDate.getTime() === today.getTime();

      if (isVotingDay && !isToday) {
        // Don't put a dot on today if it's also a voting day (today-highlight handles it)
        return (
          <div className="d-flex justify-content-center mt-1">
            <div className="election-dot-single bg-primary"></div>{" "}
            {/* Your existing dot style */}
          </div>
        );
      }
    }
    return null;
  };

  const tileClassName = ({ date, view }) => {
    if (view === "month") {
      const normalizedDate = new Date(date);
      normalizedDate.setHours(0, 0, 0, 0);
      const isToday = normalizedDate.getTime() === today.getTime();
      let classes = [];

      if (isToday) {
        classes.push("today-highlight"); // Your class for today
      }

      if (electionPeriod) {
        const eventStartDate = new Date(electionPeriod.startDate);
        eventStartDate.setHours(0, 0, 0, 0);
        const eventEndDate = new Date(electionPeriod.endDate);
        eventEndDate.setHours(0, 0, 0, 0);

        const isVotingDay =
          normalizedDate.getTime() >= eventStartDate.getTime() &&
          normalizedDate.getTime() <= eventEndDate.getTime();

        if (isVotingDay) {
          classes.push("voting-day"); // Your class for voting days
        }
      }
      return classes.length > 0 ? classes.join(" ") : null;
    }
    return null;
  };

  const prevLabel = <i className="bi bi-chevron-left"></i>;
  const nextLabel = <i className="bi bi-chevron-right"></i>;

  return (
    <div className="card h-100 border-1 rounded-4 shadow-sm">
      <div className="card-body d-flex flex-column p-0">
        <div
          className="card-header border-bottom-0 d-flex justify-content-between align-items-center bg-body rounded-top-4"
          style={{
            backgroundImage: "var(--bg-grid-subtle)",
            backgroundSize: "6px 6px",
          }}
        >
          <h6 className="card-title text-body-secondary mb-0">
            {electionPeriod
              ? `${electionPeriod.name} Calendar`
              : "Election Calendar"}{" "}
          </h6>
          <span
            className={`badge rounded-circle p-1 d-flex align-items-center justify-content-center ${
              electionPeriod ? "bg-primary-subtle" : "bg-secondary-subtle"
            }`}
          >
            <i
              className={`bi bi-circle-fill ${
                electionPeriod ? "text-primary" : "text-body-secondary"
              }`}
            ></i>
          </span>
        </div>
        <div className="election-calendar-custom flex-grow-1 p-3">
          <Calendar
            locale="en-US"
            onActiveStartDateChange={handleActiveStartDateChange}
            activeStartDate={activeMonth}
            value={activeMonth} // Set value to activeMonth to highlight the month, or null if no day selection
            tileClassName={tileClassName}
            tileContent={tileContent}
            formatShortWeekday={(locale, date) =>
              ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][date.getDay()]
            }
            showNeighboringMonth={false}
            prevLabel={prevLabel}
            nextLabel={nextLabel}
            prev2Label={null}
            next2Label={null}
            className="w-100 border-0"
            view="month"
          />
        </div>
      </div>
      <style jsx global>{`
        /* 1. Override default white background of the library */
        .react-calendar {
          background: none !important;
          border: none !important;
          font-family: var(--font-outfit) !important;
          width: 100%;
        }

        /* 2. Navigation Arrows (< >) */
        .election-calendar-custom .react-calendar__navigation__arrow {
          font-size: 1rem;
          color: var(--bs-secondary-color); /* Adaptive Grey */
          min-width: 30px;
          padding: 0.25rem 0.5rem;
          background-color: transparent;
          border: 1px solid transparent;
          border-radius: 0.5rem;
        }

        /* Hover state for arrows */
        .react-calendar__navigation button:enabled:hover,
        .react-calendar__navigation button:enabled:focus {
          background-color: var(--bs-tertiary-bg); /* Adaptive hover bg */
          border: 1px solid var(--bs-border-color); /* Adaptive border */
        }

        /* 3. Month/Year Label (e.g., "June 2025") */
        .election-calendar-custom .react-calendar__navigation__label {
          font-size: 1rem;
          color: var(--bs-body-color); /* White in dark mode, Black in light */
          font-weight: 500;
          flex-grow: 1 !important;
          pointer-events: none;
        }

        /* 4. Weekdays (Mon, Tue, Wed) */
        .election-calendar-custom .react-calendar__month-view__weekdays {
          text-align: center;
          font-weight: normal;
          font-size: 0.75rem;
          color: var(--bs-secondary-color); /* Adaptive secondary text */
          text-decoration: none !important;
          margin-bottom: 0.5rem;
        }

        .election-calendar-custom
          .react-calendar__month-view__weekdays__weekday
          abbr {
          text-decoration: none !important;
          border: none !important;
          cursor: default;
        }

        /* 5. Day Tiles (The numbers) */
        .election-calendar-custom .react-calendar__tile {
          background: none;
          color: var(--bs-body-color); /* White in dark mode */
          border-radius: 0.75rem;
          border: 1px solid transparent; /* Prevent jump on hover */
          font-size: 0.9rem;
          padding: 0.75rem 0.5rem;
        }

        /* Hover on days */
        .election-calendar-custom .react-calendar__tile:enabled:hover,
        .election-calendar-custom .react-calendar__tile:enabled:focus {
          background-color: var(
            --bs-tertiary-bg
          ); /* Adaptive light grey/dark grey */
          color: var(--bs-primary);
        }

        /* Today's Date Highlight (Circle Border) */
        .election-calendar-custom .react-calendar__tile.today-highlight {
          border: 1px solid var(--bs-primary) !important;
          color: var(--bs-primary) !important;
          font-weight: 600;
        }

        /* Election Day Highlight (Green Circle) */
        .election-calendar-custom .react-calendar__tile.election-day-highlight {
          background-color: var(--bs-success) !important;
          color: white !important;
          border: 1px solid var(--bs-success) !important;
        }

        .election-calendar-custom
          .react-calendar__tile.election-day-highlight:enabled:hover {
          background-color: #157347 !important; /* Darker green */
        }

        /* Dots */
        .election-dot-single {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        /* 6. Voting Range Background 
           Uses the variable we defined in global.css to handle opacity
        */
        .election-calendar-custom .react-calendar__tile.voting-day {
          background-color: rgba(13, 110, 253, var(--soft-bg-opacity));
          color: var(--bs-primary);
        }

        .election-calendar-custom
          .react-calendar__tile.voting-day:enabled:hover {
          background-color: rgba(
            13,
            110,
            253,
            0.3
          ); /* Slightly more visible on hover */
        }
      `}</style>
    </div>
  );
}

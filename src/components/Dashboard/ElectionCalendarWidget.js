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
          className="card-header border-bottom-0 d-flex justify-content-between align-items-center bg-white rounded-top-4"
          style={{
            backgroundImage:
              "radial-gradient(circle,rgb(241, 241, 241) 1px, transparent 1px)",
            backgroundSize: "6px 6px",
          }}
        >
          <h6 className="card-title text-secondary mb-0">
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
                electionPeriod ? "text-primary" : "text-secondary"
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
        .election-calendar-custom .react-calendar__navigation__arrow {
          font-size: 1rem; /* Arrow size */
          color: rgba(108, 117, 125, 0.75); /* Secondary color for arrows */
          min-width: 30px; /* Ensure arrows have some space */
          padding: 0.25rem 0.5rem;
          background-color: transparent;
          border: none;
          border-radius: 0.5rem;
          border: 1px solid rgba(108, 117, 125, 0);
        }
        .react-cale ndar__navigation button:enabled:hover,
        .react-calendar__navigation button:enabled:focus {
          background-color: transparent;
          border: 1px solid rgba(138, 138, 138, 0.48);
        }

        .election-calendar-custom .react-calendar__navigation__label {
          font-size: 1rem; /* Match image's month/year font size */
          color: rgb(107, 107, 107); /* Default day color */
          flex-grow: 1 !important; /* Allow label to take space */
          pointer-events: none; /* Not clickable */
        }

        .election-calendar-custom .react-calendar__month-view__weekdays {
          text-align: center;
          font-weight: normal; /* Medium weight */
          font-size: 0.75rem; /* Smaller font for MON, TUE */
          color: #6c757d; /* Bootstrap secondary color */
          margin-bottom: 0.5rem; /* Space between weekdays and days */
        }
        .election-calendar-custom
          .react-calendar__month-view__weekdays__weekday {
          padding: 0.25em 0; /* Adjust padding */
          text-decoration: none; /* Remove underline from abbr */
        }
        .election-calendar-custom
          .react-calendar__month-view__weekdays__weekday
          abbr[title] {
          text-decoration: none; /* Ensure no underline on abbr */
          border-bottom: none; /* Remove any default border */
        }

        .election-calendar-custom .react-calendar__tile {
          background: none;
          color: rgb(107, 107, 107); /* Default day color */
          border-radius: 0.75rem;
        }
        .election-calendar-custom .react-calendar__tile:enabled:hover,
        .election-calendar-custom .react-calendar__tile:enabled:focus {
          background-color: transparent; /* Darker green on hover/focus */
        }

        /* Today's Date Highlight (Blue Circle) */
        .election-calendar-custom .react-calendar__tile.today-highlight {
          background-color: transparent;
          border: 1px solid rgba(138, 138, 138, 0.48);
        }

        /* Election Day Highlight (Green Circle) */
        .election-calendar-custom .react-calendar__tile.election-day-highlight {
          background-color: #198754; /* Bootstrap success green */
          color: white;
        }
        .election-calendar-custom
          .react-calendar__tile.election-day-highlight:enabled:hover,
        .election-calendar-custom
          .react-calendar__tile.election-day-highlight:enabled:focus {
          background-color: #157347; /* Darker green on hover/focus */
        }

        /* Election Day Dot Styling */
        .election-dot {
          margin: 0rem 1rem;
          width: 0.5rem; /* Size of the dot */
          height: 0.5rem; /* Size of the dot */
          background-color: #198754; /* Bootstrap success green for the dot */
          border-radius: 5rem;
        }

        /* In ElectionCalendarWidget.js <style jsx global> or global.css */
        .election-dot-small {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          margin: 0 1px; /* Space between dots if multiple */
        }

        .election-dot-single {
          /* New style for the single dot */
          width: 6px;
          height: 6px;
          border-radius: 50%;
          /* margin: 0 auto; Centered */
          /* background-color: #0d6efd; Primary color for the dot */
        }

        /* Example: Add a subtle background to voting days (optional) */
        .election-calendar-custom .react-calendar__tile.voting-day {
          background-color: rgba(
            13,
            110,
            253,
            0.05
          ); /* Light primary background */
        }
        .election-calendar-custom
          .react-calendar__tile.voting-day:enabled:hover,
        .election-calendar-custom
          .react-calendar__tile.voting-day:enabled:focus {
          background-color: rgba(13, 110, 253, 0.1); /* Slightly darker hover */
        }

        /* Ensure today highlight works correctly with voting-day */
        .election-calendar-custom
          .react-calendar__tile.voting-day.today-highlight {
          /* Maintain both styles */
          border: 1px solid rgba(13, 110, 253, 0.5) !important; /* Today border */
          background-color: rgba(
            13,
            110,
            253,
            0.05
          ); /* Voting day background */
        }
      `}</style>
    </div>
  );
}

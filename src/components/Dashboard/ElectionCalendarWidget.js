"use client";

import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

export default function ElectionCalendarWidget({ electionEvents = [] }) {
  const [activeMonth, setActiveMonth] = useState(new Date());

  useEffect(() => {
    if (electionEvents && electionEvents.length > 0) {
      // Sort by startDate to find the earliest election month
      const sortedEvents = [...electionEvents].sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
      // Use startDate from the first event in the sorted list
      const firstEventStartDate = new Date(sortedEvents[0].startDate);
      setActiveMonth(
        new Date(
          firstEventStartDate.getFullYear(),
          firstEventStartDate.getMonth(),
          1
        )
      );
    } else {
      // If no election events, default to current month
      setActiveMonth(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      );
    }
  }, [electionEvents]); // Dependency array is correct

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleActiveStartDateChange = ({ activeStartDate }) => {
    setActiveMonth(activeStartDate);
  };

  const tileContent = ({ date, view }) => {
    if (view === "month") {
      const currentDate = new Date(date);
      currentDate.setHours(0, 0, 0, 0); // Normalize tile date

      // Check if currentDate falls within the range of ANY election event
      const isVotingDay = electionEvents.some((event) => {
        const startDate = new Date(event.startDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(event.endDate);
        endDate.setHours(0, 0, 0, 0); // Use effective end date passed from parent

        return (
          currentDate.getTime() >= startDate.getTime() &&
          currentDate.getTime() <= endDate.getTime()
        );
      });

      const isToday = currentDate.getTime() === today.getTime();

      if (isVotingDay && !isToday) {
        return (
          <div className="d-flex justify-content-center mt-1">
            <div className="election-dot-single bg-primary"></div>
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

      const isVotingDay = electionEvents.some((event) => {
        const startDate = new Date(event.startDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(event.endDate);
        endDate.setHours(0, 0, 0, 0);
        return (
          normalizedDate.getTime() >= startDate.getTime() &&
          normalizedDate.getTime() <= endDate.getTime()
        );
      });

      let classes = [];
      if (isToday) {
        classes.push("today-highlight");
      }
      if (isVotingDay) {
        classes.push("voting-day"); // Add a class for general voting days
      }

      return classes.length > 0 ? classes.join(" ") : null;
    }
    return null;
  };

  const prevLabel = <i className="bi bi-chevron-left"></i>;
  const nextLabel = <i className="bi bi-chevron-right"></i>;

  return (
    <div className="card h-100 border-1 rounded-4 shadow-sm">
      <div className="card-body d-flex flex-column p-3">
        <div className="d-flex justify-content-between align-items-center mb-0">
          <h6 className="card-title text-secondary mb-0 fw-normal">
            Election Calendar
          </h6>
        </div>
        <hr className="border-1 border-secondary opacity-20" />
        <div className="election-calendar-custom flex-grow-1">
          <Calendar
            locale="en-US"
            onActiveStartDateChange={handleActiveStartDateChange}
            activeStartDate={activeMonth}
            value={null}
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

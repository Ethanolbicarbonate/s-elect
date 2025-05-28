// src/lib/electionUtils.js
import { ElectionStatus } from "@prisma/client";

export function getEffectiveEndDate(election, studentCollege) {
  if (!election || !election.endDate) return null; // Defensive: return null if election or its main endDate is missing

  let mainEndDate;
  try {
    mainEndDate = new Date(election.endDate);
    if (isNaN(mainEndDate.getTime())) {
      // If mainEndDate is invalid (e.g., malformed string in DB), treat as null
      console.warn(
        `Invalid mainEndDate for election ${election.id}: ${election.endDate}`
      );
      return null;
    }
  } catch (e) {
    console.error(
      `Error parsing mainEndDate for election ${election.id}: ${election.endDate}`,
      e
    );
    return null;
  }

  if (
    !studentCollege ||
    !election.extensions ||
    election.extensions.length === 0
  ) {
    return mainEndDate;
  }

  const collegeExtension = election.extensions.find(
    (ext) => ext.college === studentCollege
  );

  if (collegeExtension && collegeExtension.extendedEndDate) {
    // Check if extendedEndDate exists
    let extendedEndDate;
    try {
      extendedEndDate = new Date(collegeExtension.extendedEndDate);
      if (isNaN(extendedEndDate.getTime())) {
        console.warn(
          `Invalid extendedEndDate for extension ${collegeExtension.id}: ${collegeExtension.extendedEndDate}`
        );
        return mainEndDate; // Fallback to mainEndDate if extension date is bad
      }
    } catch (e) {
      console.error(
        `Error parsing extendedEndDate for extension ${collegeExtension.id}: ${collegeExtension.extendedEndDate}`,
        e
      );
      return mainEndDate; // Fallback
    }

    if (extendedEndDate > mainEndDate) {
      return extendedEndDate;
    }
  }
  return mainEndDate;
}

export function getEffectiveStatus(election, studentCollege) {
  if (!election || !election.startDate || !election.endDate) return null; // Defensive check for essential dates

  let mainStartDate;
  try {
    mainStartDate = new Date(election.startDate);
    if (isNaN(mainStartDate.getTime())) {
      console.warn(
        `Invalid mainStartDate for election ${election.id}: ${election.startDate}`
      );
      return null; // Cannot determine status without valid start date
    }
  } catch (e) {
    console.error(
      `Error parsing mainStartDate for election ${election.id}: ${election.startDate}`,
      e
    );
    return null;
  }

  const now = new Date();
  const effectiveEndDate = getEffectiveEndDate(election, studentCollege);

  if (!effectiveEndDate) {
    // If effectiveEndDate calculation returned null (due to invalid date)
    console.warn(
      `Could not determine effectiveEndDate for election ${election.id}.`
    );
    return null; // Cannot determine status
  }

  // Prioritize explicit final statuses from DB if they are more definitive than calculated ones
  if (
    election.status === ElectionStatus.ENDED ||
    election.status === ElectionStatus.ARCHIVED
  ) {
    return election.status;
  }
  if (election.status === ElectionStatus.PAUSED) {
    return ElectionStatus.PAUSED;
  }

  // If DB status is UPCOMING or ONGOING, calculate based on dates
  if (now >= mainStartDate && now <= effectiveEndDate) {
    return ElectionStatus.ONGOING;
  } else if (now < mainStartDate) {
    return ElectionStatus.UPCOMING;
  } else {
    // now > effectiveEndDate
    return ElectionStatus.ENDED;
  }
}

// src/lib/electionUtils.js
import { ElectionStatus } from "@prisma/client"; // Assuming you use this from prisma

export function getEffectiveEndDate(election, studentCollege) {
  if (!election) return null;
  const mainEndDate = new Date(election.endDate);
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
  if (
    collegeExtension &&
    new Date(collegeExtension.extendedEndDate) > mainEndDate
  ) {
    return new Date(collegeExtension.extendedEndDate);
  }
  return mainEndDate;
}

export function getEffectiveStatus(election, studentCollege) {
  if (!election) return null;
  const now = new Date();
  const mainStartDate = new Date(election.startDate);
  const effectiveEndDate = getEffectiveEndDate(election, studentCollege);

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
    // If DB status is ONGOING but current time is before start date (e.g., clock rollback or admin error),
    // it's effectively UPCOMING or an issue.
    // For safety, if it's *marked* as ONGOING in DB but dates don't match, it might be problematic.
    // However, the primary check is for user interaction.
    return ElectionStatus.UPCOMING;
  } else {
    // now > effectiveEndDate
    return ElectionStatus.ENDED;
  }
}

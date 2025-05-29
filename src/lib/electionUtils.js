// src/lib/electionUtils.js
import { ElectionStatus } from "@prisma/client";

export function getEffectiveEndDate(election, studentCollege) {
  if (!election) {
    console.log(`DEBUG: getEffectiveEndDate - No election object provided.`);
    return null;
  }
  if (!election.endDate) {
    console.log(
      `DEBUG: getEffectiveEndDate - Election ${election.id} has no main endDate.`
    );
    return null;
  }

  let mainEndDate;
  try {
    mainEndDate = new Date(election.endDate);
    if (isNaN(mainEndDate.getTime())) {
      console.warn(
        `DEBUG: getEffectiveEndDate - Invalid mainEndDate for election ${election.id}: ${election.endDate}`
      );
      return null;
    }
  } catch (e) {
    console.error(
      `DEBUG: getEffectiveEndDate - Error parsing mainEndDate for election ${election.id}: ${election.endDate}`,
      e
    );
    return null;
  }

  if (
    !studentCollege ||
    !election.extensions ||
    election.extensions.length === 0
  ) {
    console.log(
      `DEBUG: getEffectiveEndDate - No studentCollege or no extensions. Returning mainEndDate: ${mainEndDate.toISOString()}`
    );
    return mainEndDate;
  }

  const collegeExtension = election.extensions.find(
    (ext) => ext.college === studentCollege
  );

  if (collegeExtension && collegeExtension.extendedEndDate) {
    let extendedEndDate;
    try {
      extendedEndDate = new Date(collegeExtension.extendedEndDate);
      if (isNaN(extendedEndDate.getTime())) {
        console.warn(
          `DEBUG: getEffectiveEndDate - Invalid extendedEndDate for extension ${collegeExtension.id}: ${collegeExtension.extendedEndDate}. Falling back to mainEndDate.`
        );
        return mainEndDate;
      }
    } catch (e) {
      console.error(
        `DEBUG: getEffectiveEndDate - Error parsing extendedEndDate for extension ${collegeExtension.id}: ${collegeExtension.extendedEndDate}`,
        e
      );
      return mainEndDate;
    }

    if (extendedEndDate > mainEndDate) {
      console.log(
        `DEBUG: getEffectiveEndDate - Found valid extendedEndDate: ${extendedEndDate.toISOString()}`
      );
      return extendedEndDate;
    }
  }
  console.log(
    `DEBUG: getEffectiveEndDate - No relevant valid extension. Returning mainEndDate: ${mainEndDate.toISOString()}`
  );
  return mainEndDate;
}

export function getEffectiveStatus(election, studentCollege) {
  console.log(
    `DEBUG: getEffectiveStatus - Called for election ${election?.id}. Current DB Status: ${election?.status}. StudentCollege: ${studentCollege}`
  );

  if (!election) {
    console.log(`DEBUG: getEffectiveStatus - No election object provided.`);
    return null;
  }
  if (!election.startDate) {
    console.log(
      `DEBUG: getEffectiveStatus - Election ${election.id} has no startDate.`
    );
    return null;
  }
  if (!election.endDate) {
    // Check main endDate directly before calling getEffectiveEndDate
    console.log(
      `DEBUG: getEffectiveStatus - Election ${election.id} has no main endDate.`
    );
    return null;
  }

  let mainStartDate;
  try {
    mainStartDate = new Date(election.startDate);
    if (isNaN(mainStartDate.getTime())) {
      console.warn(
        `DEBUG: getEffectiveStatus - Invalid mainStartDate for election ${election.id}: ${election.startDate}. Cannot determine status.`
      );
      return null;
    }
  } catch (e) {
    console.error(
      `DEBUG: getEffectiveStatus - Error parsing mainStartDate for election ${election.id}: ${election.startDate}`,
      e
    );
    return null;
  }

  const now = new Date();
  const effectiveEndDate = getEffectiveEndDate(election, studentCollege);
  console.log(
    `DEBUG: getEffectiveStatus - Effective End Date for ${election.id}: ${
      effectiveEndDate?.toISOString() || "NULL"
    }`
  );

  if (!effectiveEndDate) {
    console.warn(
      `DEBUG: getEffectiveStatus - Could not determine effectiveEndDate for election ${election.id}. Returning null.`
    );
    return null; // Cannot determine status
  }

  // Prioritize explicit final statuses from DB if they are more definitive than calculated ones
  if (
    election.status === ElectionStatus.ENDED ||
    election.status === ElectionStatus.ARCHIVED
  ) {
    console.log(
      `DEBUG: getEffectiveStatus - Returning DB status: ${election.status}`
    );
    return election.status;
  }
  if (election.status === ElectionStatus.PAUSED) {
    console.log(
      `DEBUG: getEffectiveStatus - Returning DB status: ${election.status}`
    );
    return ElectionStatus.PAUSED;
  }

  // If DB status is UPCOMING or ONGOING, calculate based on dates
  if (now >= mainStartDate && now <= effectiveEndDate) {
    console.log(
      `DEBUG: getEffectiveStatus - Calculated ONGOING. (now: ${now.toISOString()}, start: ${mainStartDate.toISOString()}, end: ${effectiveEndDate.toISOString()})`
    );
    return ElectionStatus.ONGOING;
  } else if (now < mainStartDate) {
    console.log(
      `DEBUG: getEffectiveStatus - Calculated UPCOMING. (now: ${now.toISOString()}, start: ${mainStartDate.toISOString()})`
    );
    return ElectionStatus.UPCOMING;
  } else {
    // now > effectiveEndDate
    console.log(
      `DEBUG: getEffectiveStatus - Calculated ENDED. (now: ${now.toISOString()}, end: ${effectiveEndDate.toISOString()})`
    );
    return ElectionStatus.ENDED;
  }
}

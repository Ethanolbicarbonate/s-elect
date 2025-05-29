// src/components/Admin/Dashboard/QuickActionsWidget.js
"use client";

import Link from "next/link";
import { PositionType } from "@prisma/client"; // Assuming PositionType is still used for scope types

export default function QuickActionsWidget({
  userRole,
  userCollege,
  electionId,
  electionStatus,
}) {
  // Determine the base path for managing entities based on user role and college
  let manageEntitiesBasePath = "/admin/election-entities";
  if (userRole === "MODERATOR") {
    if (userCollege) {
      // College Moderator
      manageEntitiesBasePath = `${manageEntitiesBasePath}?scope=${PositionType.CSC}&college=${userCollege}`;
    } else {
      // USC Moderator
      manageEntitiesBasePath = `${manageEntitiesBasePath}?scope=${PositionType.USC}`;
    }
  }
  // For SuperAdmin, no query params needed initially, they select scope on the page.

  // Determine the base path for viewing results
  let viewResultsBasePath = `/admin/results`;
  if (userRole === "MODERATOR") {
    if (userCollege) {
      // College Moderator
      viewResultsBasePath = `${viewResultsBasePath}?electionId=${electionId}&scopeType=${PositionType.CSC}&college=${userCollege}`;
    } else {
      // USC Moderator
      viewResultsBasePath = `${viewResultsBasePath}?electionId=${electionId}&scopeType=${PositionType.USC}`;
    }
  } else {
    // SuperAdmin or Auditor
    // For SuperAdmin/Auditor, we'll link to the general results page for the current election,
    // let them select the scope (USC/CSC) on the results page itself.
    // If no electionId is passed, they'll just go to the general results page.
    if (electionId) {
      viewResultsBasePath = `${viewResultsBasePath}?electionId=${electionId}`;
    }
  }

  // Conditional rendering for buttons based on role
  const canCreateElection = userRole === "SUPER_ADMIN";
  const canManageEntities =
    userRole === "SUPER_ADMIN" || userRole === "MODERATOR"; // All mods can manage their entities
  const canViewAuditLog = userRole === "SUPER_ADMIN" || userRole === "AUDITOR";
  const canViewResults =
    userRole === "SUPER_ADMIN" ||
    userRole === "MODERATOR" ||
    userRole === "AUDITOR";

  return (
    <div className="card h-100 shadow-sm flex-grow-1 rounded-4 overflow-hidden">
      <div className="card-header bg-primary text-white py-2">
        <h5 className="mb-0 h6">Quick Actions</h5>
      </div>
      <div className="card-body d-flex flex-column p-3">
        <p className="card-text small text-muted mb-3">
          Quick links to perform common tasks.
        </p>

        <div className="list-group list-group-flush flex-grow-1">
          {" "}
          {/* Flex-grow-1 to push footer down */}
          {canCreateElection && (
            <Link
              href="/admin/election-settings"
              className="list-group-item list-group-item-action d-flex align-items-center"
            >
              <i className="bi bi-calendar-plus-fill me-3 fs-5 text-primary"></i>
              <div>
                <h6 className="mb-0 fw-medium">Create New Election</h6>
                <p className="mb-0 small text-secondary opacity-75">
                  Set up a new election period.
                </p>
              </div>
            </Link>
          )}
          {canManageEntities && (
            <Link
              href={manageEntitiesBasePath}
              className="list-group-item list-group-item-action d-flex align-items-center"
            >
              <i className="bi bi-stack me-3 fs-5 text-primary"></i>
              <div>
                <h6 className="mb-0 fw-medium">Manage Election Entities</h6>
                <p className="mb-0 small text-secondary opacity-75">
                  Positions, Partylists, Candidates.
                </p>
              </div>
            </Link>
          )}
          {canViewResults && (
            <Link
              href={viewResultsBasePath}
              className="list-group-item list-group-item-action d-flex align-items-center"
            >
              <i className="bi bi-bar-chart-line-fill me-3 fs-5 text-primary"></i>
              <div>
                <h6 className="mb-0 fw-medium">View Election Results</h6>
                <p className="mb-0 small text-secondary opacity-75">
                  Live tallies and final outcomes.
                </p>
              </div>
            </Link>
          )}
          {canViewAuditLog && (
            <Link
              href="/admin/audit-log"
              className="list-group-item list-group-item-action d-flex align-items-center"
            >
              <i className="bi bi-journal-check me-3 fs-5 text-primary"></i>
              <div>
                <h6 className="mb-0 fw-medium">View Audit Log</h6>
                <p className="mb-0 small text-secondary opacity-75">
                  Review system activity timeline.
                </p>
              </div>
            </Link>
          )}
        </div>

        <div className="mt-auto pt-3 text-center">
          {" "}
          <p className="small text-secondary opacity-75 mb-0">
            For full control, use the navigation panel on the left.
          </p>
        </div>
      </div>
    </div>
  );
}

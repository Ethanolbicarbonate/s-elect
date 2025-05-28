import prisma from './prisma';
import { AuditActorType, AuditLogStatus } from '@prisma/client'; 

/**
 * Logs an action to the AuditLog table.
 * @param {object} logData - The data for the audit log entry.
 * @param {string} [logData.actorId] - ID of the admin or student. Null for SYSTEM.
 * @param {string} [logData.actorEmail] - Email of the actor.
 * @param {AuditActorType} logData.actorType - e.g., AuditActorType.ADMIN, AuditActorType.SYSTEM.
 * @param {string} logData.actionType - String from your AUDIT_ACTION_TYPES constants.
 * @param {AuditLogStatus} [logData.status=AuditLogStatus.SUCCESS] - e.g., AuditLogStatus.SUCCESS.
 * @param {string} [logData.entityType] - Type of the entity affected (e.g., "Election", "Candidate").
 * @param {string} [logData.entityId] - ID of the entity affected.
 * @param {string} [logData.targetUserId] - ID of a user being acted upon.
 * @param {string} [logData.targetUserEmail] - Email of a user being acted upon.
 * @param {object|string} [logData.details] - JSON object or string with additional details.
 * @param {string} [logData.ipAddress] - IP address of the requester.
 */
export async function writeAuditLog(logData) {
  const {
    actorId,
    actorEmail,
    actorType,
    actionType,
    status = AuditLogStatus.SUCCESS, // Default to SUCCESS if not provided
    entityType,
    entityId,
    targetUserId,
    targetUserEmail,
    details,
    ipAddress,
  } = logData;

  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        actorEmail,
        actorType,  // This should match your Prisma enum value, e.g., AuditActorType.ADMIN
        actionType, // This is the string constant, e.g., AUDIT_ACTION_TYPES.ELECTION_CREATED
        status,     // This should match your Prisma enum value, e.g., AuditLogStatus.SUCCESS
        entityType,
        entityId,
        targetUserId,
        targetUserEmail,
        details: details || undefined, // Store as JSON if object, or string. Prisma handles Json? type.
        ipAddress,
        // timestamp is handled by @default(now()) in Prisma schema
      },
    });
    // console.log("Audit log written:", actionType, actorEmail || actorId || actorType); // Optional: for dev logging
  } catch (error) {
    console.error("CRITICAL: Failed to write audit log.", {
      actionType,
      actorId,
      error: error.message,
      // Potentially log the full 'details' here if it's small, or a summary
    });
    // IMPORTANT: Decide on error handling strategy.
    // Generally, an audit log failure should NOT prevent the primary operation (e.g., creating an election) from succeeding.
    // This console.error is a minimum. In production, you might send this to an external logging service.
  }
}

// Helper function to extract IP address from a Next.js API request object
// Note: Accuracy of IP address can be affected by proxies, VPNs, etc.
// `x-forwarded-for` is common but can be spoofed. Vercel provides `req.headers['x-real-ip']` or `req.headers['x-vercel-ip-country']` etc.
export function getIpAddressFromRequest(request) {
    if (!request) return undefined;

    let ip;
    // For Next.js Edge runtime or newer versions using standard Request object
    if (request.headers && typeof request.headers.get === 'function') {
        ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
             request.headers.get('x-real-ip') ||
             request.ip; // request.ip might be available in some environments (e.g. Vercel Edge)
    } 
    // For older Next.js Pages Router API routes (req is NextApiRequest)
    else if (request.socket && request.socket.remoteAddress) {
        ip = request.socket.remoteAddress;
    }
    
    // A common fallback if running behind Vercel
    if (!ip && process.env.VERCEL) {
        // Vercel specific headers
        // Check Vercel docs for the most reliable header for client IP
        // For instance, Vercel might populate `request.headers.get('x-vercel-forwarded-for')`
    }

    return ip || undefined; // Return undefined if no IP found
}


// Admin specific logger
// This is optional; you can just use writeAuditLog directly.
export async function logAdminActivity({
  session,      // The NextAuth session object for the admin
  actionType,
  status = AuditLogStatus.SUCCESS,
  entityType,
  entityId,
  details,
  ipAddress,    // Pass this from the request object in your API route
  targetUserId,
  targetUserEmail
}) {
  if (!session || !session.user || session.user.role === 'STUDENT') { // Or broader check if admins can be non-ADMIN roles
    console.warn("Attempted to log admin activity without a valid admin session.");
    return;
  }

  await writeAuditLog({
    actorId: session.user.id,
    actorEmail: session.user.email,
    actorType: AuditActorType.ADMIN, // Assuming all admin actions logged here are by ADMIN role
    actionType,
    status,
    entityType,
    entityId,
    details,
    ipAddress,
    targetUserId,
    targetUserEmail,
  });
}
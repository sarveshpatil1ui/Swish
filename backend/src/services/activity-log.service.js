// backend/src/services/activity-log.service.js
// ─────────────────────────────────────────────────────────────────────────────
// Activity Log Service
//
// Helper function to log admin actions for auditing
// ─────────────────────────────────────────────────────────────────────────────
import ActivityLog from '../models/ActivityLog.js'

/**
 * Log an admin action
 * @param {Object} options - Logging options
 * @param {ObjectId} options.adminId - ID of the admin performing the action
 * @param {String} options.adminName - Name of the admin
 * @param {String} options.adminRole - Role of the admin
 * @param {ObjectId} options.collegeId - ID of the college
 * @param {String} options.college - Name of the college
 * @param {String} options.actionType - Type of action performed
 * @param {String} options.resourceType - Type of resource affected
 * @param {ObjectId} options.resourceId - ID of the resource
 * @param {String} options.resourceName - Name/identifier of the resource
 * @param {String} options.details - Additional details about the action
 * @param {String} options.ipAddress - IP address of the request
 */
export async function logActivity({
  adminId,
  adminName,
  adminRole,
  collegeId,
  college,
  actionType,
  resourceType,
  resourceId,
  resourceName = '',
  details = '',
  ipAddress = null,
}) {
  try {
    await ActivityLog.create({
      adminId,
      adminName,
      adminRole,
      collegeId,
      college,
      actionType,
      resourceType,
      resourceId,
      resourceName,
      details,
      ipAddress,
    })
  } catch (err) {
    // Log errors but don't throw - logging shouldn't break the main operation
    console.error('[ActivityLog] Failed to log activity:', err)
  }
}

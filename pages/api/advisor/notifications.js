import { getAdvisorSession } from "../../../lib/advisorAuth";
import {
  listNotifications,
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
  unreadCount,
} from "../../../lib/notificationsStore";
import { LeadStoreError } from "../../../lib/leadsStore";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

const VALID_TYPES = [
  "lead_purchase", "overdue_task", "missing_documents",
  "bank_status", "reminder_due", "stage_change", "system",
];

export default async function handler(req, res) {
  const session = getAdvisorSession(req);
  if (!session) return apiError(res, 401, "ADVISOR_AUTH_REQUIRED", "Advisor session required");

  try {
    if (req.method === "GET") {
      const { countOnly } = req.query;
      if (countOnly === "true") {
        const count = await unreadCount(session.advisorId);
        return res.status(200).json({ unreadCount: count });
      }
      const notifications = await listNotifications(session.advisorId);
      return res.status(200).json({ notifications });
    }

    if (req.method === "POST") {
      const { type, title, message, entityType, entityId, priority } = req.body || {};

      if (!type || !VALID_TYPES.includes(type)) {
        return apiError(res, 400, "INVALID_TYPE", `type must be one of: ${VALID_TYPES.join(", ")}`);
      }
      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return apiError(res, 400, "MISSING_TITLE", "title is required");
      }

      const notification = await createNotification({
        advisorId: session.advisorId,
        type,
        title: title.trim(),
        message: (message || "").trim(),
        entityType: entityType || null,
        entityId: entityId || null,
        priority: priority || "normal",
      });
      return res.status(201).json({ notification });
    }

    if (req.method === "PATCH") {
      const { action, notificationId } = req.body || {};

      if (action === "mark_all_read") {
        const updated = await markAllNotificationsRead(session.advisorId);
        return res.status(200).json({ updated: updated.length });
      }

      if (action === "mark_read" && notificationId) {
        const notification = await markNotificationRead(session.advisorId, notificationId);
        if (!notification) return apiError(res, 404, "NOT_FOUND", "Notification not found");
        return res.status(200).json({ notification });
      }

      return apiError(res, 400, "INVALID_ACTION", "action must be mark_read or mark_all_read");
    }

    return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
  } catch (error) {
    if (error instanceof LeadStoreError) {
      if (error.code === "SUPABASE_ENV_MISSING") return apiError(res, 503, error.code, error.message);
      return apiError(res, 502, error.code, error.message);
    }
    console.error("[notifications]", error);
    return apiError(res, 500, "NOTIFICATION_ERROR", "Unexpected error");
  }
}

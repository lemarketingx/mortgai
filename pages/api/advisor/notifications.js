import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from "../../../lib/notificationsStore";
import { getAdvisorSession } from "../../../lib/advisorAuth";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

export default async function handler(req, res) {
  const session = getAdvisorSession(req);
  if (!session) return apiError(res, 401, "ADVISOR_AUTH_REQUIRED", "Advisor session required");

  const advisorId = session.advisorId;

  if (req.method === "GET") {
    const limit = parseInt(req.query.limit, 10) || 20;
    const unreadOnly = req.query.unreadOnly === "true";
    const notifications = await getNotifications(advisorId, { limit, unreadOnly });
    const unreadCount = await getUnreadCount(advisorId);
    return res.status(200).json({ notifications, unreadCount });
  }

  if (req.method === "PATCH") {
    const body = req.body || {};
    if (body.action === "read") {
      const notificationId = String(body.notificationId || "").trim();
      if (!notificationId) return apiError(res, 400, "NOTIFICATION_ID_REQUIRED", "notificationId is required");
      const result = await markAsRead(advisorId, notificationId);
      if (!result) return apiError(res, 404, "NOTIFICATION_NOT_FOUND", "Notification not found");
      return res.status(200).json({ ok: true });
    }
    if (body.action === "readAll") {
      await markAllAsRead(advisorId);
      return res.status(200).json({ ok: true });
    }
    return apiError(res, 400, "INVALID_ACTION", "action must be 'read' or 'readAll'");
  }

  return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
}

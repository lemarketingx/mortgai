import { createTask, getTasksForAdvisor, completeTask, updateTask, deleteTask } from "../../../lib/tasksStore";
import { getAdvisorSession } from "../../../lib/advisorAuth";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

export default async function handler(req, res) {
  const session = getAdvisorSession(req);
  if (!session) return apiError(res, 401, "ADVISOR_AUTH_REQUIRED", "Advisor session required");

  const advisorId = session.advisorId;

  if (req.method === "GET") {
    const filters = {};
    if (req.query.leadId) filters.leadId = req.query.leadId;
    if (req.query.completed !== undefined) filters.completed = req.query.completed === "true";
    if (req.query.overdue === "true") filters.overdue = true;
    if (req.query.priority) filters.priority = req.query.priority;
    const tasks = await getTasksForAdvisor(advisorId, filters);
    return res.status(200).json({ tasks });
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const title = String(body.title || "").trim();
    if (!title) return apiError(res, 400, "TITLE_REQUIRED", "title is required");
    const task = await createTask({
      advisorId,
      leadId: body.leadId || null,
      title,
      description: body.description || "",
      dueDate: body.dueDate || null,
      priority: body.priority || "medium",
      type: body.type || "general",
    });
    if (!task) return apiError(res, 503, "TASK_CREATE_FAILED", "Could not create task");
    return res.status(201).json({ task });
  }

  if (req.method === "PATCH") {
    const taskId = String(req.body?.taskId || req.query.taskId || "").trim();
    if (!taskId) return apiError(res, 400, "TASK_ID_REQUIRED", "taskId is required");

    if (req.body?.action === "complete") {
      const task = await completeTask(advisorId, taskId);
      if (!task) return apiError(res, 404, "TASK_NOT_FOUND", "Task not found");
      return res.status(200).json({ task });
    }

    const updates = {};
    const allowed = ["title", "description", "dueDate", "priority", "type", "status"];
    for (const key of allowed) {
      if (req.body?.[key] !== undefined) updates[key] = req.body[key];
    }
    const task = await updateTask(advisorId, taskId, updates);
    if (!task) return apiError(res, 404, "TASK_NOT_FOUND", "Task not found");
    return res.status(200).json({ task });
  }

  if (req.method === "DELETE") {
    const taskId = String(req.query.taskId || req.body?.taskId || "").trim();
    if (!taskId) return apiError(res, 400, "TASK_ID_REQUIRED", "taskId is required");
    const deleted = await deleteTask(advisorId, taskId);
    if (!deleted) return apiError(res, 404, "TASK_NOT_FOUND", "Task not found");
    return res.status(200).json({ ok: true });
  }

  return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
}

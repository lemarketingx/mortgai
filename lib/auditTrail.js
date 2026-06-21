const auditStore = globalThis.__mortgai2AuditTrail || new Map();
globalThis.__mortgai2AuditTrail = auditStore;

export function logAuditEvent({ leadId, advisorId, action, field, oldValue, newValue, metadata = {} }) {
  const event = {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    leadId,
    advisorId,
    action,
    field: field || null,
    oldValue: oldValue !== undefined ? String(oldValue) : null,
    newValue: newValue !== undefined ? String(newValue) : null,
    metadata,
    timestamp: new Date().toISOString(),
  };
  const key = leadId || advisorId || "global";
  const events = auditStore.get(key) || [];
  events.push(event);
  if (events.length > 500) events.splice(0, events.length - 500);
  auditStore.set(key, events);
  return event;
}

export function getAuditTrail(leadId, options = {}) {
  const events = auditStore.get(leadId) || [];
  let filtered = [...events];
  if (options.action) filtered = filtered.filter(e => e.action === options.action);
  if (options.advisorId) filtered = filtered.filter(e => e.advisorId === options.advisorId);
  if (options.since) filtered = filtered.filter(e => e.timestamp >= options.since);
  return filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export const AUDIT_ACTIONS = {
  STAGE_CHANGE: "stage_change",
  NOTE_ADDED: "note_added",
  DOCUMENT_UPLOADED: "document_uploaded",
  DOCUMENT_REVIEWED: "document_reviewed",
  BANKER_ASSIGNED: "banker_assigned",
  BANKER_REMOVED: "banker_removed",
  TASK_CREATED: "task_created",
  TASK_COMPLETED: "task_completed",
  LEAD_PURCHASED: "lead_purchased",
  FIELD_UPDATED: "field_updated",
  REMINDER_SENT: "reminder_sent",
};

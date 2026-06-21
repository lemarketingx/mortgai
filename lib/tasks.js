const taskStore = globalThis.__mortgai2Tasks || new Map();
globalThis.__mortgai2Tasks = taskStore;

let idCounter = globalThis.__mortgai2TaskIdCounter || 1;

export function createTask({ leadId, advisorId, title, description = "", dueDate, priority = "medium", type = "general" }) {
  const id = `task_${Date.now()}_${idCounter++}`;
  globalThis.__mortgai2TaskIdCounter = idCounter;
  const task = {
    id,
    leadId,
    advisorId,
    title,
    description,
    dueDate: dueDate || null,
    priority,
    type,
    completed: false,
    completedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const key = `${advisorId}`;
  const tasks = taskStore.get(key) || [];
  tasks.push(task);
  taskStore.set(key, tasks);
  return task;
}

export function getTasksForAdvisor(advisorId, filters = {}) {
  const tasks = taskStore.get(advisorId) || [];
  let filtered = [...tasks];
  if (filters.leadId) filtered = filtered.filter(t => t.leadId === filters.leadId);
  if (filters.completed !== undefined) filtered = filtered.filter(t => t.completed === filters.completed);
  if (filters.overdue) {
    const now = new Date().toISOString();
    filtered = filtered.filter(t => !t.completed && t.dueDate && t.dueDate < now);
  }
  if (filters.priority) filtered = filtered.filter(t => t.priority === filters.priority);
  return filtered.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
  });
}

export function completeTask(advisorId, taskId) {
  const tasks = taskStore.get(advisorId) || [];
  const task = tasks.find(t => t.id === taskId);
  if (!task) return null;
  task.completed = true;
  task.completedAt = new Date().toISOString();
  task.updatedAt = new Date().toISOString();
  return task;
}

export function updateTask(advisorId, taskId, updates) {
  const tasks = taskStore.get(advisorId) || [];
  const task = tasks.find(t => t.id === taskId);
  if (!task) return null;
  const allowed = ["title", "description", "dueDate", "priority", "type"];
  for (const key of allowed) {
    if (updates[key] !== undefined) task[key] = updates[key];
  }
  task.updatedAt = new Date().toISOString();
  return task;
}

export function deleteTask(advisorId, taskId) {
  const tasks = taskStore.get(advisorId) || [];
  const idx = tasks.findIndex(t => t.id === taskId);
  if (idx === -1) return false;
  tasks.splice(idx, 1);
  return true;
}

export function getOverdueTasks(advisorId) {
  return getTasksForAdvisor(advisorId, { overdue: true });
}

export function getTasksDueToday(advisorId) {
  const today = new Date().toISOString().slice(0, 10);
  const tasks = taskStore.get(advisorId) || [];
  return tasks.filter(t => !t.completed && t.dueDate && t.dueDate.startsWith(today));
}

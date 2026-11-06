export function newRunner(store) {
  const id = `runner-${store.runners.size + 1}`;
  store.runners.set(id, { open: true });
  return id;
}
export function closeRunner(store, id) {
  store.runners.get(id).open = false;
}
export function startStep(store, taskId, stepId, { fresh = false } = {}) {
  const task = store.tasks.get(taskId);
  const i = task.steps.findIndex((s) => s.id === stepId);
  const prev = task.steps[i - 1];
  task.steps[i].runnerId = fresh || !prev ? newRunner(store) : prev.runnerId;
  task.steps[i].state = "started";
}
// 只有下一步已经开工、且接着用同一个会话，才算还有人在用
export function finishLeaf(store, taskId, stepId) {
  const task = store.tasks.get(taskId);
  const step = task.steps.find((s) => s.id === stepId);
  step.state = "done";
  const next = task.steps.find((s) => s.state === "started" && s.id !== stepId);
  if (!next || next.runnerId !== step.runnerId) closeRunner(store, step.runnerId);
}

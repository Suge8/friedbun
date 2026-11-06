export function newRoom(store) {
  const id = `room-${store.rooms.size + 1}`;
  store.rooms.set(id, { open: true });
  return id;
}
export function closeRoom(store, id) {
  store.rooms.get(id).open = false;
}
export function startStep(store, taskId, stepId, { fresh = false } = {}) {
  const task = store.tasks.get(taskId);
  const i = task.steps.findIndex((s) => s.id === stepId);
  const prev = task.steps[i - 1];
  task.steps[i].roomId = fresh || !prev ? newRoom(store) : prev.roomId;
  task.steps[i].state = "started";
}
// 只有下一步已经开工、且接着用同一个会话，才算还有人在用
export function finishLeaf(store, taskId, stepId) {
  const task = store.tasks.get(taskId);
  const step = task.steps.find((s) => s.id === stepId);
  step.state = "done";
  const next = task.steps.find((s) => s.state === "started" && s.id !== stepId);
  if (!next || next.roomId !== step.roomId) closeRoom(store, step.roomId);
}

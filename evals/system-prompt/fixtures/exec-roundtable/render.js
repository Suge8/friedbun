import { lastAiId } from "./marker.js";
export function renderThread(messages) {
  const mark = lastAiId(messages);
  return messages.map((m) => `${m.id === mark ? "[最新] " : ""}${m.kind === "user" ? "我" : m.name}: ${m.text}`);
}

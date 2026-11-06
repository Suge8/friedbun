export function lastAiId(messages) {
  return messages.findLast((m) => m.kind === "avatar")?.id;
}

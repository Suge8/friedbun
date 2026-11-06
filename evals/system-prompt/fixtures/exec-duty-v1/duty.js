export const onDuty = (s) => s.bot.enabled;
export const handler = (q, s) => (onDuty(s) && q.answerable ? "bot" : "user");

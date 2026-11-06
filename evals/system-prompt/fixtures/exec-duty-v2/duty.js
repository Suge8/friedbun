export const onDuty = (s) => s.dispatcher.enabled;
export const handler = (q, s) => (onDuty(s) && q.answerable ? "dispatcher" : "user");

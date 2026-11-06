export const onDuty = (s) => s.cue.enabled;
export const handler = (q, s) => (onDuty(s) && q.answerable ? "cue" : "user");

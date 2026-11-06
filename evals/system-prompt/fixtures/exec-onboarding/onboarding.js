export function panelOffer(s) {
  if (s.cue.localConfig) return { kind: "running" };
  return { kind: "enable-here" };
}

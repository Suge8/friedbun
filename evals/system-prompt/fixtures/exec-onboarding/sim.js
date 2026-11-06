import { panelOffer } from "./onboarding.js";
const scenarios = {
  "全新用户": { icloud: { syncDone: true }, cue: { localConfig: false, remoteHost: null } },
  "新 Mac，iCloud 未同步完": { icloud: { syncDone: false }, cue: { localConfig: false, remoteHost: null } },
  "新 Mac，同步完，Cue 在 Studio 上": { icloud: { syncDone: true }, cue: { localConfig: false, remoteHost: "Studio" } },
  "本机已在跑": { icloud: { syncDone: true }, cue: { localConfig: true, remoteHost: null } },
};
for (const [name, s] of Object.entries(scenarios)) console.log(name, "=>", JSON.stringify(panelOffer(s)));

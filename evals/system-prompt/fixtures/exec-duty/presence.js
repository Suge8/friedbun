// 现有信号：Cue 所在那台 Mac 是否睡着/关机（"Mac 在睡觉"提示用的就是它）
export const macAsleep = (s) => s.mac.lastSeen < s.now - 60_000;

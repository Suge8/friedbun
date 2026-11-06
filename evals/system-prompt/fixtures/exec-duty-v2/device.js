// 现有信号：打印机是否离线（设备页"离线"徽标用的就是它）
export const printerOffline = (s) => s.printer.lastSeen < s.now - 60_000;

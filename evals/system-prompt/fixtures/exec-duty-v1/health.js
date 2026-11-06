// 现有信号：工单系统是否失联（顶部"系统异常"横幅用的就是它）
export const ticketSystemDown = (s) => s.ticket.lastSeen < s.now - 60_000;

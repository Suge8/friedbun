export function unreadCount(msgs) {
  return msgs.filter((m) => m.unread || m.pinned).length;
}
export function tabTitle(msgs) {
  return `(${msgs.filter((m) => m.unread).length}) Inbox`;
}
export function markRead(m) {
  m.read = true;
}
export function bannerA(online) {
  return online ? [] : ["retry-banner"];
}
export function bannerB(online) {
  return online ? [] : ["retry-banner"];
}
export function banners(online) {
  return [...bannerA(online), ...bannerB(online)];
}

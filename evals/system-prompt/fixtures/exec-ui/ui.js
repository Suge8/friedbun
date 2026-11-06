export function renderRows(items) {
  return items.map((i) => ({ id: i.id, text: i.title, status: i.returned ? "已返回待发落" : "" }));
}
export function ack(item) {
  item.acked = true;
}
export function listButtons(scrolledUp) {
  return scrolledUp ? ["jump-latest"] : [];
}
export function overlayButtons(scrolledUp) {
  return scrolledUp ? ["jump-latest"] : [];
}
export function allButtons(scrolledUp) {
  return [...listButtons(scrolledUp), ...overlayButtons(scrolledUp)];
}

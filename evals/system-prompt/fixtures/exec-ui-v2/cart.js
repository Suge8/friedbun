export function summary(items) {
  return items.map((i) => `${i.name} x${i.qty}`);
}
export function total(items) {
  return items.reduce((s, i) => s + i.price * i.qty, 0);
}
export function remove(item) {
  item.removed = true;
}
export function barButtons(narrow) {
  return narrow ? ["checkout"] : [];
}
export function footerButtons(narrow) {
  return narrow ? ["checkout"] : [];
}
export function checkoutButtons(narrow) {
  return [...barButtons(narrow), ...footerButtons(narrow)];
}

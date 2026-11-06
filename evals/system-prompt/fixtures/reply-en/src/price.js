export function total(items) {
  return items.reduce((s, i) => s + i.price * i.qty, 0);
}

export function applyDiscount(amount, pct) {
  return amount * (1 - pct);
}

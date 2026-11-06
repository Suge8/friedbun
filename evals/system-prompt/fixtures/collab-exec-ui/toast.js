export function showToast(kind, text, root = document.body) {
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.textContent = text;
  root.append(el);
  setTimeout(() => el.remove(), 3000);
}

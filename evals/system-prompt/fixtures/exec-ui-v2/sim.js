import { summary, total, remove, checkoutButtons } from "./cart.js";
const items = [{ name: "茶", qty: 1, price: 30 }, { name: "杯", qty: 2, price: 20 }];
remove(items[0]);
console.log("summary:", JSON.stringify(summary(items)), "total:", total(items));
console.log("checkout buttons on narrow screen:", checkoutButtons(true).length);

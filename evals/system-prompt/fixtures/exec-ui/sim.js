import { renderRows, ack, allButtons } from "./ui.js";
const items = [{ id: 1, title: "发布检查", returned: true }, { id: 2, title: "补测试", returned: true }];
ack(items[0]);
console.log("rows:", JSON.stringify(renderRows(items)));
console.log("buttons after scroll up:", allButtons(true).length);

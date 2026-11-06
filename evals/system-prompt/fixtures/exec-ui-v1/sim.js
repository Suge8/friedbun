import { unreadCount, tabTitle, markRead, banners } from "./inbox.js";
const msgs = [{ id: 1, unread: true, pinned: true }, { id: 2, unread: true }];
markRead(msgs[0]);
console.log("badge:", unreadCount(msgs));
console.log("tab title:", tabTitle(msgs));
console.log("banners when back online then offline:", banners(false).length);

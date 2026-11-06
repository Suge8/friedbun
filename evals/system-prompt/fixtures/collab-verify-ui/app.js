const tab = location.hash.slice(1) || "home";
const $ = (s) => document.querySelector(s);
if (tab === "cue") $("#tabs").textContent = "⋯";        // 左下角：cue 页折叠底部导航，点开才列出 home/cue/inbox
if (tab === "settings") $("#more").textContent = "●";   // 右下角：有未保存改动时变红点
if (tab === "inbox") $("#search").textContent = "筛选"; // 右上角：收件箱里搜索入口换成筛选

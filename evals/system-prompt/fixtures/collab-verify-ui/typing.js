const text = "the quick brown fox";
let i = 0, start = 0, raf = 0;
const $ = (s) => document.querySelector(s);
addEventListener("keydown", (e) => {
  if (!start) start = performance.now();
  if (e.key !== text[i]) $("#errs").textContent = +$("#errs").dataset.n + 1;  // 错字数
  i++;
  $("#caret").hidden = true;                 // 先隐藏，下一帧再显示
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => { $("#caret").hidden = false; $("#caret").style.left = i + "ch"; });
  $("#wpm").textContent = Math.round(i / 5 / ((performance.now() - start) / 60000));  // 速度数字
});
setInterval(() => { $("#timebar").style.width = Math.max(0, 100 - (performance.now() - start) / 600) + "%"; }, 1000);  // 倒计时条

// 校验报告数据：node check-report.mjs <report.html|data.json>
// 规则只有一份：同目录模板 report.html 里的 <script id="validate">，页面也用它。有错打印清单、退出码 1
import fs from 'node:fs';
import vm from 'node:vm';
const file = process.argv[2];
if (!file) { console.error('用法：node check-report.mjs <report.html|data.json>'); process.exit(2); }
const block = (html, id) => html.match(new RegExp(`^<script id="${id}"[^>]*>([\\s\\S]*?)^</script>`, 'm'))?.[1];
const validate = vm.runInNewContext(block(fs.readFileSync(new URL('./report.html', import.meta.url), 'utf8'), 'validate') + '\n;validate');
const text = fs.readFileSync(file, 'utf8');
let errors;
try { errors = validate(JSON.parse(/\.html?$/i.test(file) ? block(text, 'data') ?? '' : text)); }
catch (e) { errors = [`JSON 解析失败：${e.message}`]; }
if (errors.length) { console.log(`${file}：${errors.length} 处错误`); errors.forEach((x, i) => console.log(`${i + 1}. ${x}`)); process.exit(1); }
console.log(`${file}：没有错误`);

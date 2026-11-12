// 生成报告：node report.mjs <data.json> [报告.html]
// 校验数据，通过才把它填进模板副本写到输出路径；不给输出路径就只校验。有错打印清单、退出码 1。
// 校验规则只有一份：同目录模板 report.html 里的 <script id="validate">，页面也用它
import fs from 'node:fs';
import vm from 'node:vm';
const [file, out] = process.argv.slice(2);
if (!file) { console.error('用法：node report.mjs <data.json> [报告.html]'); process.exit(2); }
const template = fs.readFileSync(new URL('./report.html', import.meta.url), 'utf8');
const block = id => new RegExp(`(^<script id="${id}"[^>]*>)([\\s\\S]*?)(^</script>)`, 'm');
const validate = vm.runInNewContext(template.match(block('validate'))[2] + '\n;validate');
let data, errors;
try { data = JSON.parse(fs.readFileSync(file, 'utf8')); errors = validate(data); }
catch (e) { errors = [`JSON 解析失败：${e.message}`]; }
if (errors.length) { console.log(`${file}：${errors.length} 处错误`); errors.forEach((x, i) => console.log(`${i + 1}. ${x}`)); process.exit(1); }
if (!out) { console.log(`${file}：没有错误`); process.exit(0); }
// < 转义成 \u003c：数据里的 </script> 不会截断脚本块
const json = JSON.stringify(data).replace(/</g, '\\u003c');
fs.writeFileSync(out, template.replace(block('data'), (_, open, _old, close) => `${open}\n${json}\n${close}`));
console.log(`${out}：已生成`);

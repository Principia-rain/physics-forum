/* =====================================================================
 * check_formulas.cjs —— 发布前校验一个问题文件：
 *   front matter 结构 + 附件存在性 + protectMath 配对 + KaTeX 全量编译
 * 运行： node tools/check_formulas.cjs 示例问题1-弱阻尼振子.md
 *       （参数相对 questions/ 目录；缺省检查第一个示例）
 * ===================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, 'questions', process.argv[2] || '示例问题1-弱阻尼振子.md');
const md = fs.readFileSync(FILE, 'utf8');
let fails = 0;
const ok = (c, name) => { console.log((c ? 'PASS ' : 'FAIL ') + name); if (!c) fails++; };

/* ---- front matter ---- */
const C = require(path.join(ROOT, 'assets', 'core.js'));
const fm = C.parseFrontMatter(md);
ok(!!fm.meta.title, 'title 存在: ' + (fm.meta.title || '(缺失)'));
ok(!!fm.meta.date, 'date 存在: ' + (fm.meta.date || '(缺失)'));
ok(['已解决', '讨论中'].indexOf(fm.meta.status) !== -1, 'status ∈ {已解决, 讨论中}: ' + (fm.meta.status || '(缺失)'));
const tagsRaw = (md.match(/^tags: (.+)$/m) || [])[1] || '';
ok(/^\[.+\]$/.test(tagsRaw.trim()), 'tags 是行内数组: ' + tagsRaw.trim());
ok(C.splitList(fm.meta.tags || '').length > 0, 'tags 非空');
if (fm.meta.attach) {
  const files = C.splitList(fm.meta.attach);
  ok(files.length > 0, 'attach 非空: ' + files.join(', '));
  for (const f of files) {
    const p = path.join(ROOT, 'questions', f);
    ok(fs.existsSync(p), '附件存在: ' + f + (fs.existsSync(p) ? ' (' + fs.statSync(p).size + ' B)' : ' ← 缺文件！'));
  }
}

/* ---- 正文结构：应含解答块 ---- */
ok(/^##\s*(解答|答案|回答|题解|解法|解$|解[:：])/m.test(fm.body), '正文含「解答」块（## 解答/解…）');

/* ---- protectMath ---- */
const p = C.protectMath(fm.body);
const zmtokCount = (p.text.match(/ZMTOK/g) || []).length;
ok(p.store.length === zmtokCount, 'store 条数(' + p.store.length + ') = ZMTOK 次数(' + zmtokCount + ')');
const bareDollar = p.text.replace(/ZMTOK\d*/g, '').split('').filter(ch => ch === '$').length;
ok(bareDollar === 0, '正文无裸 $（残留 ' + bareDollar + ' 个）');

/* ---- katex compile ---- */
function dl(url) {
  return new Promise((res, rej) => {
    https.get(url, r => {
      if (r.statusCode >= 300 && r.headers.location) return dl(r.headers.location).then(res, rej);
      const chunks = [];
      r.on('data', d => chunks.push(d));
      r.on('end', () => res(Buffer.concat(chunks).toString('utf8')));
    }).on('error', rej);
  });
}

(async () => {
  const cache = path.join(__dirname, 'katex.min.cache.js');
  let src;
  if (fs.existsSync(cache) && fs.statSync(cache).size > 100000) {
    src = fs.readFileSync(cache, 'utf8');
    console.log('使用本地缓存的 katex');
  } else {
    src = await dl('https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js');
    fs.writeFileSync(cache, src);
    console.log('已下载并缓存 katex 0.16.11');
  }
  const sandbox = { exports: {}, module: { exports: {} }, console, Math, JSON, String, Number, Array, Object, Symbol, Map, Set, RegExp, Error, parseInt, parseFloat, isNaN, Date };
  sandbox.globalThis = sandbox;
  vm.runInContext(src, vm.createContext(sandbox), { filename: 'katex.min.js' });
  const katex = sandbox.module.exports || sandbox.exports;
  ok(typeof katex.renderToString === 'function', 'katex 加载成功');

  let errs = 0, block = 0, inline = 0;
  const errList = [];
  for (const raw of p.store) {
    let tex = raw, isBlock = false;
    if (raw.startsWith('$$')) { tex = raw.replace(/^\$\$/, '').replace(/\$\$$/, ''); isBlock = true; }
    else tex = raw.replace(/^\$/, '').replace(/\$$/, '');
    tex = tex.trim();
    if (isBlock) block++; else inline++;
    try {
      katex.renderToString(tex, { throwOnError: true, displayMode: isBlock });
    } catch (e) {
      errs++;
      if (errList.length < 8) errList.push((isBlock ? '[块]' : '[行] ') + tex.slice(0, 70) + ' → ' + e.message.slice(0, 80));
    }
  }
  ok(errs === 0, 'KaTeX 编译 ' + (block + inline) + ' 条（块 ' + block + ' / 行 ' + inline + '），错误 ' + errs);
  errList.forEach(e => console.log('  ' + e));
  console.log(fails === 0 ? '\n全部通过 ✅' : '\n有 ' + fails + ' 项未通过 ❌');
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('脚本异常:', e.message); process.exit(2); });

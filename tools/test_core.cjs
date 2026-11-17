/* =====================================================================
 * test_core.cjs —— core.js 纯逻辑单元测试（物理讨论站版）
 * 运行： node tools/test_core.cjs
 * ===================================================================== */
'use strict';

const C = require('../assets/core.js');
const assert = require('assert');

let passed = 0;
function ok(cond, name) {
  if (!cond) { console.error('✗ FAIL: ' + name); process.exit(1); }
  passed++;
  console.log('✓ ' + name);
}

/* ---------------- detectRepo ---------------- */
ok(JSON.stringify(C.detectRepo({}, { hostname: 'zhangsan.github.io', pathname: '/my-forum/' })) ===
   JSON.stringify({ owner: 'zhangsan', repo: 'my-forum', branch: '', contentDir: 'questions', ok: true, source: 'auto' }),
   'detectRepo: 项目页自动识别（contentDir 默认 questions）');

const d2 = C.detectRepo({}, { hostname: 'zhangsan.github.io', pathname: '/' });
ok(d2.owner === 'zhangsan' && d2.repo === 'zhangsan.github.io', 'detectRepo: 用户主页识别');

const d3 = C.detectRepo({ owner: 'abc', repo: 'xyz', branch: 'dev' }, { hostname: 'localhost', pathname: '/' });
ok(d3.owner === 'abc' && d3.repo === 'xyz' && d3.branch === 'dev' && d3.source === 'config', 'detectRepo: config 优先');

const d4 = C.detectRepo({ questionsDir: 'qa' }, { hostname: 'localhost', pathname: '/' });
ok(d4.contentDir === 'qa', 'detectRepo: questionsDir 配置生效');

ok(C.detectRepo({}, { hostname: 'localhost', pathname: '/x/' }).ok === false, 'detectRepo: 本地未配置 → ok=false');

/* ---------------- parseFrontMatter ---------------- */
const fm1 = C.parseFrontMatter('---\ntitle: "我的问题"\nauthor: 张三\ntags: [力学, 振动]\n---\n\n## 问题');
ok(fm1.meta.title === '我的问题' && fm1.meta.author === '张三', 'front matter: 基本字段+去引号');
ok(JSON.stringify(C.splitList(fm1.meta.tags)) === JSON.stringify(['力学', '振动']), 'front matter: yaml 数组拆分');
ok(fm1.body.startsWith('## 问题'), 'front matter: body 正确剥离');

const fm2 = C.parseFrontMatter('---\nabstract: |\n  第一行。\n  第二行，带逗号。\nyear: 2026\n---\nbody');
ok(fm2.meta.abstract === '第一行。 第二行，带逗号。', 'front matter: 块级 abstract 多行合并');

const fm3 = C.parseFrontMatter('---\ntitle: X\n---');
ok(fm3.meta.title === 'X' && fm3.body === '', 'front matter: 结尾无换行');

const fm4 = C.parseFrontMatter('## 无 front matter');
ok(Object.keys(fm4.meta).length === 0 && fm4.body === '## 无 front matter', 'front matter: 缺失时全当正文');

const fm5 = C.parseFrontMatter('---\r\ntitle: 换行符\r\n---\r\n正文');
ok(fm5.meta.title === '换行符', 'front matter: CRLF 兼容');

/* ---------------- metaFromFrontMatter（含讨论站新字段） ---------------- */
const mf = C.metaFromFrontMatter('q.md', {
  title: '标题', date: '2026-01-05', tags: 'a，b；c',
  status: '已解决', difficulty: '★★☆', source: '力学习题课',
  attach: '[示例题目.pdf, 图.png]'
});
ok(mf.title === '标题' && mf.tags.length === 3, 'metaFromFrontMatter: 中英文分隔符');
ok(mf.status === '已解决' && mf.difficulty === '★★☆' && mf.source === '力学习题课', 'metaFromFrontMatter: status/difficulty/source');
ok(JSON.stringify(mf.attach) === JSON.stringify(['示例题目.pdf', '图.png']), 'metaFromFrontMatter: attach 数组拆分');

const mf2 = C.metaFromFrontMatter('no-meta.md', {});
ok(mf2.title === 'no-meta' && mf2.status === '' && mf2.attach.length === 0, 'metaFromFrontMatter: 缺省回退');

/* ---------------- normStatus ---------------- */
ok(C.normStatus('已解决') === 'solved', 'normStatus: 已解决');
ok(C.normStatus('solved') === 'solved', 'normStatus: solved');
ok(C.normStatus('讨论中') === 'open', 'normStatus: 讨论中');
ok(C.normStatus('待解答') === 'open', 'normStatus: 待解答');
ok(C.normStatus('') === 'open', 'normStatus: 空 → open');
ok(C.normStatus('乱写的状态') === 'open', 'normStatus: 未知 → open');

/* ---------------- protectMath ---------------- */
const p1 = C.protectMath('行内 $E=mc^2$ 与 $\\hbar$。');
ok(p1.store.length === 2 && p1.store[0] === '$E=mc^2$', 'protectMath: 行内公式计数');
ok(!/\$E=mc/.test(p1.text), 'protectMath: 公式已替换为占位符');

const p2 = C.protectMath('$$\nx = \\begin{aligned}a_b\\end{aligned}\n$$\n后文');
ok(p2.store.length === 1 && /\n/.test(p2.store[0]), 'protectMath: $$ 可跨行');

const p4 = C.protectMath('价格 \\$5，而公式 $x+y$ 有效');
ok(p4.store.length === 1 && p4.store[0] === '$x+y$', 'protectMath: 转义 \\$ 不误判');

const p5 = C.protectMath('```\n$$x$$\n```\n普通 $y$');
ok(p5.store.length === 1 && p5.store[0] === '$y$', 'protectMath: 代码块内的 $$ 不入公式库');

const p6 = C.protectMath('孤立的 $ 符号不配对');
ok(p6.store.length === 0 && p6.dolStore.length === 0, 'protectMath: 单个 $ 不误判');

/* ---------------- buildEntries ---------------- */
const files = [
  { name: 'b问题.pdf', sha: 's2', size: 2048 },
  { name: 'a问题.pdf.json', sha: 's3', size: 100 },
  { name: 'a问题.pdf', sha: 's4', size: 4096 },
  { name: '附件.pdf', sha: 's8', size: 8192 },
  { name: '_草稿.md', sha: 's5', size: 10 },
  { name: 'c问题.md', sha: 's6', size: 500 },
  { name: 'd图片.png', sha: 's7', size: 900 },
];
const mdMeta = { 'c问题.md': { name: 'c问题.md', type: 'md', title: '问题C', date: '2026-01-01', abstract: '关于光速', tags: ['光'], status: '已解决', difficulty: '★★', source: '量子力学习题', attach: ['附件.pdf'], code: [] } };
const sidecars = { 'a问题.pdf': { title: '问题A', date: '2026-05-01', status: '讨论中', source: '讨论班', tags: [], code: [], attach: [] } };

/* API 路径：pdfNeedsSidecar=true → 无 sidecar 的 PDF（附件）不单列 */
const eApi = C.buildEntries(files, mdMeta, sidecars, { pdfNeedsSidecar: true });
ok(eApi.length === 2, 'buildEntries(API): 只剩 md + 带 sidecar 的 pdf，附件不单列');
ok(eApi[0].name === 'a问题.pdf' && eApi[0].title === '问题A', 'buildEntries: 按日期倒序 + sidecar 合并');
ok(eApi[0].status === '讨论中' && eApi[0].source === '讨论班', 'buildEntries: sidecar 的 status/source 合并');
ok(eApi[1].name === 'c问题.md' && eApi[1].title === '问题C', 'buildEntries: front matter 合并');
ok(eApi[1].status === '已解决' && eApi[1].source === '量子力学习题', 'buildEntries: md 的 status/source 合并');
ok(JSON.stringify(eApi[1].attach) === JSON.stringify(['附件.pdf']), 'buildEntries: md 的 attach 合并');
ok(eApi.every(e => e.name.indexOf('.json') === -1), 'buildEntries: sidecar 不出现在条目里');

/* index.json 路径：不做 sidecar 过滤（脚本已在生成时处理），
   此时 md + 全部 PDF（a 有 sidecar，b/附件 无）都算条目 */
const eIdx = C.buildEntries(files, mdMeta, sidecars);
ok(eIdx.length === 4, 'buildEntries(index.json): 不过滤时 md + 3 个 PDF 共 4 条');

/* ---------------- filterEntries ---------------- */
ok(C.filterEntries(eApi, '光速', null).length === 1, 'filterEntries: 关键词搜摘要');
ok(C.filterEntries(eApi, '量子力学', null).length === 1, 'filterEntries: 关键词搜来源（新字段）');
ok(C.filterEntries(eApi, '', '光').length === 1, 'filterEntries: 标签过滤');
ok(C.filterEntries(eApi, '', null).length === 2, 'filterEntries: 空条件全通过');

/* ---------------- base64 往返 ---------------- */
const sample = '中文内容 Chinese 𝑥 + 换行\n第二行';
ok(C.b64ToUtf8(C.utf8ToB64(sample)) === sample, 'base64: UTF-8 往返一致');

/* ---------------- URL 构造 ---------------- */
const rep = { owner: 'zhang san', repo: 'my-forum' };
ok(C.rawUrl(rep, 'questions/示例 问题.md') ===
   'https://raw.githubusercontent.com/zhang%20san/my-forum/HEAD/questions/%E7%A4%BA%E4%BE%8B%20%E9%97%AE%E9%A2%98.md',
   'rawUrl: 中文与空格编码');
ok(C.apiUrl(rep, 'questions') === 'https://api.github.com/repos/zhang%20san/my-forum/questions', 'apiUrl: 编码');

/* ---------------- 日期 ---------------- */
ok(C.fmtDate('2026-11-17') === '2026-11-17', 'fmtDate: 标准日期');
ok(C.fmtDate('2026-1-5') === '2026-01-05', 'fmtDate: 补零');
ok(C.fmtDate('November 17, 2026') === '2026-11-17', 'fmtDate: 英文日期归一');
ok(C.fmtDate('2026 年秋') === '2026 年秋', 'fmtDate: 手写日期原样保留');

/* ---------------- sidecar 约定 ---------------- */
ok(C.sidecarNameFor('a.pdf') === 'a.pdf.json' && C.sidecarKeyOf('a.pdf.json') === 'a.pdf', 'sidecar 命名约定');

/* ---------------- metaFromSidecar 容错 ---------------- */
ok(C.metaFromSidecar('{bad json').title === '', 'metaFromSidecar: 坏 JSON 不抛异常');

console.log('\n全部 ' + passed + ' 项测试通过 ✅');

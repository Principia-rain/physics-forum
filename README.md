# 物理讨论站

一个依托 **GitHub Pages** 的物理问题讨论网站：**一道道问题与解答，题目附件以 PDF 呈现**。
纯静态、无后端、无数据库、无统计脚本 —— 仓库本身就是全部。

姊妹站：[论文站](https://github.com/Principia-rain/Principaper)（讲义与长文）。

## 功能一览

| 角色 | 能做什么 |
|---|---|
| 访客 | 浏览/搜索/按标签与状态（已解决 · 讨论中）筛选问题；阅读问答页（**问题 → 解答 → 讨论** 分块排版，KaTeX 公式、代码高亮）；**页内预览 PDF 附件**；深浅色主题；Ctrl+P 打印 |
| 站主 | 网页内**直接上传/删除**问题与附件（GitHub 管理面板）；也可用 GitHub 网页上传或 git push |

Markdown 渲染由 [marked](https://github.com/markedjs/marked) 完成，公式由 [KaTeX](https://github.com/KaTeX/KaTeX) 渲染，代码高亮用 [highlight.js](https://github.com/highlightjs/highlight.js) —— 均来自公共 CDN，向这些开源项目致谢。

---

## 一、从零部署到 GitHub（约 5 分钟）

1. **新建公开仓库**（例如 `physics-forum`），不要自动生成 README；
2. 上传本文件夹全部文件（网页拖入或 git push）；
3. 仓库 *Settings → Pages → Deploy from a branch → main / (root)*；
4. 访问 `https://你的用户名.github.io/仓库名/` —— 站点从网址自动识别仓库，`config.js` 无需修改。

## 二、发布一道问题（三种方式，任选）

| 方式 | 操作 | 适合 |
|---|---|---|
| **① 站内管理面板** | 网站 → 右上角「站主登录」→ 粘贴 GitHub Token → 拖入文件上传 | 日常使用，手机也能用 |
| ② GitHub 网页上传 | 仓库 → `questions/` 目录 → *Add file* → *Upload files* | 偶尔发一下 |
| ③ git push | 把 `.md` / `.pdf` 放进 `questions/` 目录提交推送 | 用命令行时 |

上传后约 **1 分钟**内全站可见（GitHub Pages 构建时间）。

### 问题写作格式

每道题一个 `.md` 文件，front matter + 三段式正文（模板见 `questions/_问题模板.md`）：

```markdown
---
title: 问题标题
date: 2026-11-17
tags: [力学, 振动与波]
status: 已解决            # 或 讨论中
difficulty: ★★☆
source: 力学习题课         # 可省略
author: Principia-rain
abstract: 一两句摘要，显示在首页卡片上。
attach: 题目附件.pdf       # 可省略；多个用逗号分隔
---

问题正文（第一个标题之前的部分自动成为「问题」块）。

## 解答

完整推导。行内公式 $E = mc^2$，块级公式 $$ ... $$。

## 讨论

延伸思考、未定论的问题、欢迎补充的方向。
```

- 正文的 `##` 标题会自动分块：`问题/题目/原题…` → ❓问题块；`解答/答案/题解/解法/证明…` → ✅解答块；`讨论/备注/追问/延伸…` → 💬讨论块；其余标题原样保留。一题多解写多个「解」开头的标题即可；
- 公式定界符 `$...$` / `$$...$$`（代码块里的 `$` 会被刻意保持原样）；
- `status`、`tags` 是首页筛选的依据；`date` 是排序依据（新的在前）。

### PDF 附件约定（重点）

**每个问题都可以带 PDF 附件**：题目扫描件、作业纸、试卷、讲义节选……

- 把 PDF 和问题 `.md` 放进同一个 `questions/` 目录；
- 在问题的 front matter 里写 `attach: 文件名.pdf`（多个：`attach: [a.pdf, b.pdf]`）；
- 阅读页顶部会出现附件框：第一个附件**自动内嵌预览**，其余点「展开预览」；手机浏览器若不支持内嵌 PDF，用「新标签页打开」；
- 子目录也可以：`attach: figs/题目.pdf`；
- **没有**被任何 `attach` 引用的 PDF 默认只是躺在仓库里，不会出现在列表；
- 想发一道**只有 PDF** 的题（如整卷讨论）？给 PDF 配一个同名 JSON（`my.pdf.json`），写上 `title/status/tags` 等字段，它就会作为「纯 PDF 问题」单独出现在列表里。管理面板单独上传一个 PDF 并填写信息时会自动生成这个 JSON。

文件大小：GitHub 单文件上限 100 MB；建议题目扫描件压到 10–20 MB 以内，加载快。

## 三、站主登录（GitHub Token）

1. GitHub → 头像 → *Settings* → 最底部 *Developer settings*；
2. *Personal access tokens → Fine-grained tokens → Generate new token*；
3. **Repository access** 选 *Only select repositories*，只勾选本仓库；
4. **Permissions → Repository permissions → Contents: Read and write**；
5. 生成后复制（`github_pat_` 开头），粘贴进网站的登录框。

安全设计：Token 只保存在你自己的浏览器里，本站是纯静态页面、没有后端，Token 只会发送给 `api.github.com`；建议只授予这一个仓库并设有效期，怀疑泄露时到 *Developer settings* 一键删除。

## 四、本地预览

```bash
cd physics-forum
python tools/build_index.py      # 扫描 questions/ 生成 index.json（本地模式用）
python -m http.server 8000
# 浏览器打开 http://localhost:8000
```

> 直接双击 index.html（file://）看不到列表（浏览器限制 fetch），请走上面的本地服务器。

## 五、发布前自检（可选但推荐）

```bash
node tools/test_core.cjs                        # core.js 单元测试
node tools/check_formulas.cjs 你的问题文件.md     # front matter/附件/公式 KaTeX 全量编译
python tools/build_index.py                     # 重建 index.json（useIndexJson 开启时需要）
```

## 六、常见问题（FAQ）

| 现象 | 原因与处理 |
|---|---|
| 列表报「找不到仓库」 | 仓库名/用户名识别错了（自定义域名时需在 `config.js` 手工填 `owner`/`repo`），或仓库不是 Public |
| 报 403 限流 | GitHub API 匿名限额 60 次/小时/IP。稍等再试；或 `python tools/build_index.py` 后把 `config.js` 的 `useIndexJson` 设为 true（之后每次增删问题要重跑） |
| 刚上传的问题没出现 | Pages 构建 + 缓存延迟，等 1–2 分钟；或点列表 ⟳ 强刷 |
| 公式没渲染 | 确认定界符是 `$...$` / `$$...$$`；代码块里的 `$` 被刻意保持原样 |
| PDF 不显示 | 部分手机浏览器不支持内嵌 PDF，用附件框里的「新标签页打开」；确认 front matter 的 `attach` 文件名与仓库内文件一致（含扩展名） |
| 想改配色 | 编辑 `assets/style.css` 顶部的 CSS 变量即可 |

## 七、目录结构

```
physics-forum/
├── index.html            页面骨架
├── config.js             站主配置（站名、缓存、进阶选项；一般不用改）
├── about.md              「关于」页内容
├── .nojekyll             让 Pages 跳过 Jekyll、原样发布
├── assets/
│   ├── style.css         样式（浅/深双主题 + 问答分块/状态徽章/附件框）
│   ├── core.js           纯逻辑（front matter、公式保护、状态归一化…）
│   └── app.js            页面逻辑（列表/问答阅读/路由/管理面板）
├── questions/            ← 问题与附件都放这里
│   ├── _问题模板.md        写作模板（下划线开头，不展示）
│   ├── 示例问题1-弱阻尼振子.md
│   ├── 示例题目1-阻尼振动.pdf   ← 示例问题1 的附件
│   └── 示例问题2-猫态与经典混合态.md
└── tools/
    ├── build_index.py      可选：生成 index.json（应对 API 限流）
    ├── check_formulas.cjs  发布前校验（含离线 KaTeX 编译）
    ├── test_core.cjs       单元测试
    └── katex.min.cache.js  KaTeX 本地缓存（校验脚本用）
```

## 许可

本站代码与站主问题/解答内容采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh) 许可：
可自由转载与演绎，但需署名（Principia-rain 及本站链接）、不得用于商业目的、衍生作品需同许可。
题目附件版权归原作者；若引用他人题目，以页面标注为准。

<div align="center">

# GitHub Star Manager

**本地优先的 GitHub Star 仓库管理工具，基于 Star Lists 整理你的星标。**

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](./LICENSE)
[![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev)
[![Vite 7](https://img.shields.io/badge/Vite-7-646cff?logo=vite&logoColor=white)](https://vite.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages%20%2F%20Workers-f38020?logo=cloudflare&logoColor=white)](https://developers.cloudflare.com)

**[🚀 在线体验](https://gh-star.smyhub.com/)** · [English README](./README.en.md)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/shumengya/github-star-manager)

**点上面的按钮，一键把 GitHub Star Manager 部署到你自己的 Cloudflare 账号。**

</div>

---

## 为什么需要 Star Manager

当 Star 仓库达到几百个之后，GitHub 自带的平铺列表会变得很难浏览。Star Manager 在 GitHub **Star Lists** 之上提供了一个快速、可搜索的工作台：

- **同步** GitHub 上的 Star 仓库与 Star Lists，数据超过 24 小时自动标记过期，失败的列表扫描可单独重试。
- **浏览与筛选**：按列表、语言、关键词搜索、只看未分组、只看最近星标来定位仓库。
- **整理**：几次点击即可把仓库归入列表 —— 先本地生效，再写回 GitHub。
- **管理列表**：在应用内直接创建 / 重命名 / 删除 Star Lists，变更同步到 GitHub 账号。
- **本地优先**：所有工作数据保存在浏览器 IndexedDB（Dexie）；PAT 只保存在你的浏览器中。

## 工作原理

应用完全运行在浏览器中，通过同源代理访问 GitHub API，规避 CORS 限制：

```text
┌────────────┐   /api/github/*    ┌──────────────────────┐   https://api.github.com
│   浏览器    │ ─────────────────► │     薄代理层          │ ────────────────────────►  GitHub
│ (React 19) │                    │ • 开发: Vite proxy   │
└────────────┘                    │ • 生产: CF Functions │
     │  IndexedDB (Dexie)         └──────────────────────┘
     └─ 仓库 / 列表 / 成员关系 / README 摘要
```

- **开发环境** — Vite dev server 内置代理（`vite.config.ts`）把 `/api/github/*` 转发到 `api.github.com`。
- **生产环境** — 二选一：
  - `functions/api/github/`（Cloudflare Pages Functions）
  - `worker/index.js` + `wrangler.jsonc`（Cloudflare Workers 静态资源模式，供一键部署按钮使用）

两者逻辑等价：GitHub PAT 由浏览器以 `Authorization` 请求头发出并被原样转发，服务端**不会**记录或存储。

## 功能特性

- ⭐ **Star 同步** — 拉取 Star 仓库与 Star Lists，扫描列表成员关系，失败项可单独重试。
- 🗂 **列表工作台** — 侧栏展示 *全部 Star* / *未分组* / 自定义列表，带实时计数。
- 🔍 **筛选与搜索** — 仓库名/描述全文搜索、语言过滤、只看未分组、只看最近星标。
- 📋 **README 摘要** — 可选开启每个仓库的 README 预览，帮助决定归类。
- ✏️ **分配列表** — 为单个仓库多选列表归属，保存前本地预览，保存时写回 GitHub。
- 🛠 **列表管理** — 创建、重命名、删除 Star Lists，与 GitHub 保持同步。
- 🌐 **国际化** — 中/英双语界面，自动识别浏览器语言，也可手动切换。
- 🧹 **缓存控制** — 随时在设置中清空本地缓存。

## 一键部署到你的 Cloudflare

点击仓库顶部（或上方）的 **Deploy to Cloudflare** 按钮，登录你的 Cloudflare 账号后：

1. Cloudflare 会自动 Fork 本仓库并执行构建（`pnpm build`）。
2. 构建完成后即得到一个属于你自己的实例，绑定 `*.workers.dev` 域名。
3. 打开你自己的域名，填入 GitHub PAT 即可开始使用。

> 部署基于 `wrangler.jsonc`（Workers 静态资源模式）：静态页面由 `dist/` 提供，`/api/github/*` 由 `worker/index.js` 代理到 GitHub API，全程无需任何额外配置。

## 手动部署

### 方式一：Cloudflare Pages

| 配置项 | 值 |
| --- | --- |
| 构建命令 | `pnpm build` |
| 构建输出目录 | `dist` |
| 根目录 | `/` |
| Node 版本 | 20+（必要时设置环境变量 `NODE_VERSION=20`） |

`functions/api/github/` 目录会被 Cloudflare Pages 自动识别为 Functions，无需额外配置。

### 方式二：Cloudflare Workers（wrangler）

```bash
pnpm install
npx wrangler deploy   # 自动构建 dist 并部署
```

### 本地开发

**环境要求**：Node.js 20+、[pnpm](https://pnpm.io)、GitHub Personal Access Token（PAT）。

```bash
pnpm install
pnpm dev      # 启动开发服务器（自带 API 代理）
pnpm build    # 类型检查 + 生产构建
pnpm preview  # 本地预览生产构建
```

## 获取 GitHub PAT

1. 打开 <https://github.com/settings/tokens>。
2. **Generate new token → Generate new token (classic)**。
3. 填写名称（如 `star-manager`），勾选权限范围：
   - `repo` — 读取 Star、管理列表
   - `user` — 读取个人资料
4. 复制 Token，在应用中打开 **Settings → GitHub PAT**（或首次运行的引导提示），粘贴并验证。

Token 会通过 GitHub GraphQL API 校验，且只保存在浏览器 localStorage 中。

## 使用流程

1. **连接** — 粘贴 PAT 并验证。
2. **同步** — 点击 *同步* 拉取 Star 与列表；数据超过 24 小时会自动重新同步。
3. **浏览** — 用侧栏列表、搜索框、语言过滤和开关（未分组/最近）定位仓库。
4. **整理** — 点击仓库的 *分配* 操作增删其所属列表，或打开 *管理列表* 创建/重命名/删除列表。
5. **写回** — 在分配弹窗中保存时，变更会被推送到 GitHub。

## 项目结构

```text
functions/api/github/       # Cloudflare Pages Functions（API 代理）
worker/index.js             # Cloudflare Workers 入口（一键部署用，逻辑等价）
wrangler.jsonc              # Workers 配置（静态资源 + API 代理路由）
public/                     # 静态资源（favicon、logo、旧 SW 清理脚本）
src/
  main.tsx                  # 应用入口
  app/
    App.tsx                 # 主界面与编排
    layout/                 # 应用外壳、列表侧栏、仓库目录与行组件
    core/                   # 用例：同步、队列、写回、清理
    services/               # GitHub REST/GraphQL 客户端与鉴权
    data/                   # Dexie 数据层与响应式查询
    store/                  # 偏好设置（PAT、语言、README 开关）
    types/                  # 领域类型
    ui/                     # 弹窗与提示（PAT、设置、列表、分配）
    i18n/                   # 中英文资源与语言检测
    styles/                 # 设计令牌、控件、对话框、字体
```

## 数据与隐私

- 应用数据保存在浏览器 **IndexedDB**（数据库 `star-manager`）；偏好设置（PAT、语言）保存在 **localStorage**。
- 应用由浏览器直接调用 GitHub（经同源代理），无第三方分析、无遥测。
- 代理只做原样转发，不在服务端记录或持久化任何 Token。
- 若浏览器中存有 PAT，请勿导出或分享浏览器存储数据。

## 常见问题

| 现象 | 处理 |
| --- | --- |
| `Star Lists API not available for this token/account` | 当前账号或 Token 可能无法访问 Star Lists 的 GraphQL 字段，检查权限范围或账号功能。 |
| PAT 校验失败 | 检查 Token 内容与权限范围，必要时重新生成。 |
| 同步后没有仓库 | 确认账号确实有 Star 仓库，且同步已完成。 |
| 部分列表出现重试按钮 | 列表成员扫描触发限流，点击重试仅补扫失败的列表。 |

## 路线图

- 增量同步，减少 API 调用。
- 更完善的限流处理与失败恢复。
- 更清晰的错误归因（权限 / Token / 网络）。
- README 摘要缓存策略（`ETag`/哈希 + 截断规则）。
- 可选的 LLM 辅助分类（两阶段打标流水线）。

## 贡献

欢迎提交 Issue 与 PR；较大改动建议先开 Issue 讨论方案。

```bash
pnpm install
pnpm dev      # 开发
pnpm build    # 类型检查 + 生产构建
```

## 许可证

基于 [AGPL-3.0](./LICENSE) 许可证发布。

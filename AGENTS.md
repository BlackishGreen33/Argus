<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Argus 代理工作规范

本文件是代理进入仓库后的总入口。它只保留必须先知道的产品边界、安全不变量、文件路由和变更流程；完整操作说明与设计契约放在对应文件中。

## 文件路由与权威范围

先按任务阅读本文件和受影响代码，再阅读下表中的唯一权威文档。文档之间有冲突时，按“权威顺序”处理，不把同一段完整内容复制到多个文件。

| 任务                                   | 必读文档                                                 | 文档负责的内容                                      | 主要代码入口                                                                              |
| -------------------------------------- | -------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 安装、Demo、环境变量、外部服务、部署   | [README.md](./README.md)                                 | 面向使用者的操作步骤、配置边界和 API 快速摘要       | `.env.example`、`package.json`、`prisma.config.ts`                                        |
| 新增或修改页面、组件、样式、文案、交互 | [DESIGN.md](./DESIGN.md)                                 | UI 视觉、交互、状态、响应式、动效、文案和可及性契约 | `src/app/page.tsx`、`src/components/`、`src/client/`、`src/i18n/`、`src/app/globals.scss` |
| 技术选型、模块边界或长期取舍           | [docs/decisions.md](./docs/decisions.md)                 | 可持续的决策、取舍和约束；不记录临时实现步骤        | `src/app/api/[[...route]]/route.ts`、`src/server/`、`src/client/`、`prisma/`              |
| 当前范围、未完成工作、里程碑和依赖     | [docs/plan.md](./docs/plan.md)                           | 当前计划和开放事项；不复制已落地的技术契约          | 产品入口和本次受影响模块                                                                  |
| 添加或改变测试、验证命令、覆盖范围     | [docs/test-matrix.md](./docs/test-matrix.md)             | 可重跑的覆盖场景、命令和证据位置                    | `tests/`、`e2e/`、`vitest.config.ts`、`playwright.config.ts`                              |
| 发布或部署                             | [docs/release-checklist.md](./docs/release-checklist.md) | 每次发布都要重新填写的门槛与证据字段                | `.github/workflows/ci.yml`、Vercel、Supabase                                              |
| 新增风险、改变回退策略或外部依赖       | [docs/risk-register.md](./docs/risk-register.md)         | 仍然存在的风险、触发条件、责任人和处置路径          | `src/server/auth.ts`、`src/server/jobs/`、`src/server/cache/`、`prisma/`                  |
| 记录 AI 建议、取舍和验证               | [docs/ai-log.md](./docs/ai-log.md)                       | 不可变的来源与验证记录，不定义系统行为              | 当前变更的提交、命令和证据                                                                |
| 任务看板工作流                         | [docs/project-board.md](./docs/project-board.md)         | 看板列、卡片字段和进入条件                          | GitHub Projects（若启用）                                                                 |

`GET /api/openapi.json` 和 `/api/docs` 是机器／课堂入口，不能代替完整的人类 API 说明；当前 OpenAPI 注册仍需与 `src/server/api/routes/` 逐项核对。

## 权威顺序与冲突处理

1. 当前行为以运行时代码、Prisma schema、测试结果和实际命令输出为准。
2. 本文件定义代理必须遵守的产品、安全、数据和边界不变量。
3. `DESIGN.md` 定义 UI 的目标契约；实现与契约冲突时，先记录差异，再决定修代码还是修契约。
4. `docs/decisions.md` 记录长期取舍，不替代当前代码行为。
5. `README.md` 面向人类使用者，提供可执行的安装、配置、部署和 API 摘要。
6. 其他 `docs/` 文件只在自己的职责范围内有效。测试、发布、风险和 AI 记录中的状态必须带日期、提交或外部证据，不能凭旧勾选继续代表现在。

## 项目边界

Argus 是面向 DevSecOps 和安全审查人员的漏洞分流工作台。它整理导入的 CVE、Component 和候选关联，提供可搜索、可修改、可追溯的审查流程；本项目不加入 Agent、自动修复或聊天能力。

- UI、错误消息、表单标签使用简体中文；`Argus`、`Triage`、`Overview`、`History` 等品牌和展示标题保留英文。
- `Guest` 只能浏览、搜索和查看详情；`Admin` 才能修改、删除、管理 Component、批量修改状态和执行导入。
- 顶部搜索是跨页面命令入口，可搜索 CVE、Component、PURL；Triage 内搜索只筛选当前列表，两者不能混用。
- CVE 只从内置 SQL 导入，不提供人工新增；Component 提供完整 CRUD。
- 详情抽屉支持快速修改 triage 状态；`History` 只展示状态、时间和操作者。

## 技术与依赖边界

- Node.js 24、pnpm 12.6.0、Next.js 16 App Router、Turbopack、Tailwind CSS。
- Next adapter 位于 `src/app/api/[[...route]]/route.ts`；Hono 组合和路由位于 `src/server/api/`，输入在 API 边界用 Zod 验证。
- Supabase Postgres + Prisma 7；Supabase Auth 使用 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`，不使用 service role key 或 `sb_secret`。
- QStash 和 Upstash Redis 都是可选整合。没有 QStash 时导入走同步 fallback；没有 Redis 时不能阻塞页面读取。
- Vercel Hobby 是展示部署目标。公开环境的变量只能在平台 Secret／Environment Variables 中配置。

目录与依赖方向如下，目录变动时要先检查本节和文件路由是否仍然准确：

```text
src/
├── app/                         # Next route、layout、全局样式；API route 只做 adapter
├── client/                      # Axios、QueryProvider、hooks、Jotai state
├── components/                  # 页面切片和可交互 UI；不直接读数据库
├── constants/                   # 状态、分页、主题和产品常量
├── i18n/                        # 客户端与服务端文案资源
├── server/
│   ├── api/                     # Hono 组合、route、schema 和 response 边界
│   ├── services/                # 按领域组织的业务流程和数据操作
│   ├── data/                    # parser 和 Demo 数据
│   ├── db/                      # Prisma client
│   ├── cache/                   # Redis 可选加速层
│   └── jobs/                    # QStash 与导入 worker
├── types/                       # 前后端共享 contract
└── utils/                       # 无副作用的格式化和 label 映射
```

Client component 不得直接 import `prisma`、Node.js API 或 server-only store；跨边界必须经过 `/api/*`。`NEXT_PUBLIC_*` 只存放可公开值，数据库连接、QStash token 和管理员设定只能在 server 端读取。

## 数据与安全不变量

- Prisma migration 必须可重复执行。导入 parser 必须保留 checksum、preview、merge transaction 和 `sourceMissing`，来源消失时不能自动删除数据。
- 修改、删除、状态变更、导入、合并和批量操作都必须写入 `AuditEvent`。
- API 成功响应使用 `{ data, meta? }`，错误响应使用 `{ ok: false, error: { message, details? } }`；前端不绕过 API 直接读数据库。
- URL、表单、导入文件和 webhook 输入都不可信，不能用类型断言代替运行时验证。
- `QSTASH_CURRENT_SIGNING_KEY` 与 `QSTASH_NEXT_SIGNING_KEY` 成对存在时才验证签名；未配置时保留本地／展示 fallback，不能让普通启动失败。

## 目录变更与文档同步

任何目录下的新增、删除、改名、代码变更、配置变更、测试变更或文档变更，都必须在完成前执行一次文件影响判断。流程如下：

1. 读取受影响模块、测试、本文件和对应路由文档。
2. 用 `git diff --name-only` 查看完整变更集合，按下表检查文档影响。
3. 如果公开行为、权限、数据模型、API、UI 契约、运行命令、部署配置、外部依赖、风险或验证证据发生变化，在同一批变更中主动更新对应文档；不等待再次询问。
4. 如果判断无需更新文档，在交付说明中写明受影响路径和理由。不能因为改动很小就跳过判断。
5. 完成前检查链接、路径、命令和文档之间是否仍然一致。

| 变更路径                                                                                                                            | 至少检查的文档                                                                                       | 典型触发条件                                              |
| ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `src/app/`、`src/components/`、`src/client/`、`src/i18n/`、`src/constants/theme.ts`、`src/app/globals.scss`、`src/app/tailwind.css` | `DESIGN.md`；涉及使用流程时检查 `README.md`；测试变化检查 `docs/test-matrix.md`                      | 页面、交互、文案、主题、响应式、权限展示或状态变化        |
| `src/app/api/`、`src/server/api/`、`src/server/services/`、`src/server/auth.ts`                                                     | `README.md`、`AGENTS.md`；长期边界或取舍检查 `docs/decisions.md`；行为验证检查 `docs/test-matrix.md` | API、权限、response contract、导入、审计或服务边界变化    |
| `src/server/data/`、`src/server/db/`、`src/server/cache/`、`src/server/jobs/`、`prisma/`、`data/source/`                            | `README.md`、`AGENTS.md`、`docs/test-matrix.md`；连接或回退风险检查 `docs/risk-register.md`          | schema、migration、seed、来源字段、缓存、队列或持久化变化 |
| `.env.example`、`package.json`、`prisma.config.ts`、`.github/workflows/`、`vitest.config.ts`、`playwright.config.ts`                | `README.md`、`AGENTS.md`、`docs/test-matrix.md`、`docs/release-checklist.md`                         | 安装、命令、环境变量、CI、测试入口或部署前提变化          |
| `tests/`、`e2e/`                                                                                                                    | `docs/test-matrix.md`；发布覆盖变化检查 `docs/release-checklist.md`                                  | 新增、删除或改变验证场景                                  |
| `README.md`、`DESIGN.md` 或 `docs/`                                                                                                 | 受影响的反向链接和本文件路由表                                                                       | 文件职责、标题、链接、权威范围或语言变化                  |

## 开发与验证

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

数据库相关变更另外执行 `pnpm prisma validate`、`pnpm db:migrate` 和必要的 seed。`format:check` 当前由 `.prettierignore` 排除 Markdown，因此文档变更还必须执行 `git diff --check`，并人工检查链接、路径和重复内容。

## 变更纪律

- 先读受影响模块、测试和本文件，再做最小必要修改；不为了顺手重排无关文件。
- 保留用户已有的删除，不自行恢复未被要求恢复的文件。
- 新增提交使用 `<emoji> <type>(<scope>): <desc>`，提交前用 git-workflow validator 验证。
- CI job 按责任拆分，名称要能直接指向失败位置；本地与 CI 使用相同的 pnpm scripts。
- 完成前必须回看 `git diff`，执行与变更风险相称的检查，不能用未执行的命令宣称通过。

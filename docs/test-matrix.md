# Argus 测试矩阵

本文是唯一的跨层验证覆盖索引。它记录“要测什么、如何重跑、证据放在哪里”；不把没有日期、commit 或 CI run 的旧状态当作当前结论。每次发布或重大变更后，在证据列写入日期、commit、环境和链接。

| 层级             | 必测场景                                                             | 重跑入口                                                  | 证据要求                               |
| ---------------- | -------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------- |
| Parser           | Component 和 CVE 来源数量、checksum、重复导入                        | `pnpm test -- tests/parser.test.ts`                       | fixture、解析摘要和失败输入            |
| Parser           | 逗号、转义引号、换行和 JSON-like 字段                                | Vitest fixture                                            | 失败样例和 parser 输出                 |
| API system       | health、统一成功／错误响应、OpenAPI 和 docs 入口                     | `pnpm test -- tests/api-regression.test.ts`、curl         | 请求、状态码和 response body           |
| API CVE          | 列表、详情、搜索、修改、删除、批量状态                               | API regression + 受影响 route 测试                        | Guest／Admin、无效输入和 AuditEvent    |
| API Component    | 列表、搜索、新增、修改、删除、PURL 边界                              | API regression 或 curl                                    | 字段校验、权限、删除审计               |
| API Auth         | providers、me、Demo login、Email login、OAuth callback、logout       | 浏览器或 route 测试                                       | Guest／Admin 状态、cookie、失败反馈    |
| Import           | 创建、preview、stage rows、merge、retry、sourceMissing               | API workflow + parser tests                               | checksum、差异样本、事务结果和失败 job |
| Database         | schema、migration、seed、重启后读取                                  | `pnpm prisma validate`、`pnpm db:migrate`、`pnpm db:seed` | 数据库版本、命令输出和读取结果         |
| Cache／Queue     | Redis 缺失回退、QStash 缺失同步 worker、签名配置边界                 | 环境变量矩阵 + API workflow                               | 配置组合、回退结果和错误日志           |
| UI               | 双搜索、筛选、详情 Sheet、状态修改、Components、Overview、通知、登录 | `pnpm test:e2e` + Chrome 走查                             | 路线、视口、console、网络和截图        |
| UI responsive    | 桌面、平板、手机、极窄屏、无水平溢出                                 | Playwright viewport + 浏览器                              | 实际视口、浏览器版本和证据             |
| UI accessibility | Tab、Enter、Space、Esc、focus、aria、reduced motion                  | Playwright + 浏览器辅助检查                               | 受影响路线和失败项                     |
| UI replacements  | CVSS 缺值／零分、复制成功／失败、真实 job 状态、Tabs 布局与 Sheet 宽度 | `pnpm test:e2e e2e/ui-replacements.spec.ts`                | 官方组件、错误状态、键盘和窄屏回归     |
| UI polish        | 同列控制尺寸、手机首屏、44px 触控、唯读字段、身份和三主题对比          | `pnpm test:e2e e2e/ui-polish.spec.ts`                      | 1440／1024／390／320px、前后截图和 DOM 实测 |
| UI import／CVSS  | 真实导入阶段、样本展开、合并失败／重试、轮询恢复、完整表头和零起点动画 | `pnpm test:e2e e2e/import-workflow.spec.ts`               | Guest／Admin、桌面／窄屏、中间帧与 reduced motion |
| UI formatting    | 三语系完整短日期、空值                                               | `pnpm test -- tests/format.test.ts`                       | 年月日完整、固定输入和预期输出         |
| Build            | lint、format、typecheck、unit、production build、E2E                 | package scripts 与 CI                                     | 每个 job 的 run、commit 和环境         |
| 文档             | 路由、命令、路径、链接、权威范围和语言一致                           | `git diff --check` + 链接检查                             | 变更文件、检查命令和未更新理由         |

## 记录状态的规则

- “已覆盖”只说明有测试入口，不代表最近一次通过。
- “已验证”必须同时写日期、commit、运行环境和证据位置。
- 不能引用仓库不存在的脚本；当前 API 验收使用 route 测试、curl 或新增的可追踪测试，并在证据中写出实际入口。
- UI 细节以 [DESIGN.md](../DESIGN.md) 的契约和路线为准；发布是否放行以 [发布前检查表](./release-checklist.md) 为准。
- 测试入口、目录、API 或环境变量发生变化时，按 [AGENTS.md](../AGENTS.md) 同步更新本表。

## 2026-10-25：七项官方 UI 组件替换

- 基准：`acf0fcf` 加本次未提交工作树；仅本地 Demo 验收，不代表正式数据库、CI 或生产部署已通过。
- 环境：macOS、Node.js 24.15.0、pnpm CLI 11.25.0（`packageManager` 声明仍为 12.6.0）、Next.js 16.3.6、Animate UI 2.2.1、Motion 14.6.0；浏览器为 HeadlessChrome 155.0.0.0。
- Demo 以 `DEMO_MODE=true`、`ADMIN_EMAIL=admin@argus.local` 启动，并将 Redis URL／token、QStash token 显式置空；访问 `http://localhost:3100/`，不使用正式数据库或队列。`PLAYWRIGHT_BASE_URL` 指定已启动服务时，测试不再另开 webServer；默认测试 origin 也使用 localhost，与 Next adapter 的同源检查一致。

| 检查 | 实际结果与证据 |
| --- | --- |
| `pnpm lint`、`pnpm format:check`、`pnpm typecheck` | 通过 |
| `pnpm test` | 2 个文件、7 项通过；Vitest 提示未来 native config loader 的模块格式兼容警告，当前测试未失败 |
| `env PLAYWRIGHT_BASE_URL=http://localhost:3100 pnpm test:e2e` | 21 项通过（49.3s），包含原有 16 项和新增 5 项 |
| `pnpm build`（同一 Demo 环境） | Turbopack 编译、TypeScript、页面数据与静态页面生成全部通过；构建在允许联网和本地 worker 端口的执行环境运行 |
| Tabs 布局回归 | 新增页签列高度、panel 在页签下方及内容宽度断言；修复前实际测得页签列高 601px 并失败，修复后 1440／390／320px 视口均通过 |
| 状态与可访问性 | 新增 E2E 用 route／Clipboard mock 覆盖 CVSS 缺值／0／10／9.8、复制失败、Guest 不发送导入请求、RUNNING 保持 loading、HTTP 错误与 FAILED 不显示成功；Tabs／Select 键盘、Esc、焦点回收及 reduced motion 通过 |
| 实际 Demo 预览 | 浏览器通过 Demo 登录后执行真实内建资料预览，解析 1000 条 CVE 与 398 个 Component，两个 Stateful Button 均显示“预览已就绪”；只预览，未执行合并 |
| 浏览器实拍 | `output/playwright/ui-replacements/` 下的 `drawer-desktop.png`、`drawer-mobile.png`、`select-desktop.png`、`overview-desktop.png`、`overview-success-desktop.png`、`overview-success-mobile.png`；已逐张查看，桌面 1440×1000、手机 390×844；专用验收页面 console error／warning 为 0 |

本地重跑（先在一个终端启动 Demo，再在另一个终端执行测试）：

```bash
env DEMO_MODE=true ADMIN_EMAIL=admin@argus.local \
  UPSTASH_REDIS_REST_URL= \
  UPSTASH_REDIS_REST_TOKEN= \
  QSTASH_TOKEN= \
  pnpm dev --hostname 127.0.0.1 --port 3100
env PLAYWRIGHT_BASE_URL=http://localhost:3100 pnpm test:e2e
```

本轮未变更 API、权限、数据库 schema、migration 或部署配置，因此未执行数据库迁移与正式环境验收。第三方许可仍按 [声明](../THIRD_PARTY_NOTICES.md) 与 [风险登记](./risk-register.md) 的发布门槛处理。

## 2026-10-26：F01–F09 UI 细节精修

- 基准：`acf0fcf` 加本次 UI 精修工作树，包含上一轮官方组件替换；此记录只代表本地 Demo，不代表远端 CI 或生产部署验收。
- 环境与上一轮相同，访问 `http://localhost:3100/`；Redis 和 QStash 显式置空，未执行数据合并。刷新改为复用项目原有 Button 和 Lucide 状态图标，不再包含 Aceternity registry 源码；真实 job polling、防重复提交及成功／失败反馈均保留。
- 可重跑测试：`e2e/ui-polish.spec.ts`、`e2e/ui-replacements.spec.ts`、`e2e/argus.spec.ts`、`tests/format.test.ts`。本机图文证据位于被 Git 忽略的 `output/playwright/ui-polish/`，其中 `argus-ui-comparison.html`／`.md` 包含 9 组前后实拍，`measurements.json` 保存 DOM 实测，`manifest.json` 记录图像尺寸与摘要；截图不充当自动化断言。

| 检查 | 实际结果与证据 |
| --- | --- |
| `pnpm check` | lint、format:check、typecheck 全部通过；unit 共 3 个文件、8 项通过。Vitest 仍提示未来 native config loader 模块格式兼容警告 |
| `env PLAYWRIGHT_BASE_URL=http://localhost:3100 pnpm test:e2e` | 26 项通过（1.1m），包含原有 16 项、组件替换 5 项和精修 5 项；末次结果存于 `test-results/.last-run.json` |
| `pnpm build`（同一 Demo 环境） | Turbopack、TypeScript、页面数据与静态页面生成通过。首次沙箱 worker 端口错误写入构建缓存，保留并移开失败缓存后，在允许本地 worker 端口的环境干净重跑通过；没有改构建器或配置 |
| F01／F02／F04 | 同列 Input、刷新、类型筛选在 1440／1024px 均高 40px，在 390／320px 均高 44px，圆角 8px；类型选中不跳高。三主题账号 email 为 12px、正常态对比均 ≥4.5:1；点击 Admin 姓名不登出，独立登出控制仍可用 |
| F03／F08 | 390／320px 的 Copy、关闭、Tabs、状态选项、删除确认／取消均至少 44×44px；Copy 与关闭、删除确认与取消不重叠；取消删除后焦点返回原控制 |
| F05／F06 | 三语系短日期 unit 通过；桌面日期单元格完整显示且无裁切。390×844、Admin、导航收起时首笔 y=357.58px，第二笔底部 y=689.86px；全局命令与列表搜索互不覆盖，无水平溢出 |
| F07／F08 | 1440／390／320px 的编辑器外层 padding 为 0，header／form 分别使用桌面 24px、手机 16px；PURL 为 enabled readonly、opacity 1；取消删除保留未保存名称与原 PURL |
| F09 与视觉检查 | 保留品牌、三主题与数据；桌面 1440×1000、手机 390×844 共 9 组同情境截图逐张检查。手机 IAB 输出图片为 375×812，前后像素尺寸相同，不与请求视口混淆 |
| 浏览器日志 | 专用验收页 console error 为 0，保留 1 条开发期 Fast Refresh full reload warning；未将其报告为零警告 |

文件影响判断：UI 契约已同步 [DESIGN.md](../DESIGN.md)，入口与第三方来源同步 [README](../README.md) 和 [第三方声明](../THIRD_PARTY_NOTICES.md)，依赖边界与发布风险同步 [decisions](./decisions.md)、[risk-register](./risk-register.md) 和 [release-checklist](./release-checklist.md)。API、权限、数据库、migration 和部署变量未变，因此不修改它们的契约，也未执行正式数据库迁移或生产验收。

## 2026-10-26：导入工作流与 CVSS 可读性、入场动效

- 基准：`353dbe9c6d6a265cbbd17abb47ec0f8c3f463e17` 加本次 UI 改动；本节记录推送前的本地验证，不代表远程 CI 或生产验收。环境为 macOS、Node.js 24.15.0、pnpm CLI 11.25.0，沿用上述隔离 Demo 服务 `http://localhost:3100/`。
- 新增 `e2e/import-workflow.spec.ts` 的 10 项检查。大多数状态使用路由 fixture；另有真实 Demo 登录与内建数据预览，读取 1000 条 CVE、398 条 Component，仅预览、不执行合并。模拟的合并成功／失败不能当作正式数据库事务验收。
- 前后 Chromium 截图位于被 Git 忽略的 `output/playwright/ui-followup/before/` 和 `after/`。匹配对比使用相同 Guest fixture 与 1440／390／320px 视口；`overview-real-*.png` 则来自真实 Demo Admin 预览。截图是测试浏览器的实际渲染，不是设计稿；自动截图内可见 Next.js 开发工具浮标。

| 检查 | 实际结果与证据 |
| --- | --- |
| `pnpm check` | lint、format:check、typecheck 通过；3 个 unit 文件、8 项通过。Vitest 仍有原有 native config loader 兼容警告 |
| `env PLAYWRIGHT_BASE_URL=http://localhost:3100 pnpm test:e2e --reporter=line` | 36 项通过（1.5m），原有 26 项与新增 10 项全部通过；日志 `/tmp/argus-ui-followup-all-e2e.log`，末次结果 `test-results/.last-run.json` |
| `pnpm build`（同一 Demo 环境） | Prisma Client 生成、Turbopack、TypeScript、页面数据与静态页面生成通过；日志 `/tmp/argus-ui-followup-build.log` |
| CVSS 表头 | 修复前检测到 `scrollWidth > clientWidth`；修复后 Guest／Admin 在 1440、1024、841px 均完整显示，保留手机版卡片布局 |
| CVSS 入场 | 采样同时观察到数值 0、中间值、最终 9.8，以及圆弧中间长度、最终 98%；reduced motion 为 0ms 并直接显示最终值，缺值与 0／10 保持区分 |
| 导入工作流 | 预览只完成解析；合并请求未返回时禁用重复提交；仅 SUCCEEDED 完成三步；FAILED 无成功反馈并保留重试；恢复已有运行中 job 的轮询，HTTP 失败后可重新操作 |
| 样本与手机 | Animate UI Accordion 支持 Enter 展开、`aria-expanded`、长 PURL 完整换行；1440／390／320px 无页面水平溢出，手机样本触发器与刷新至少 44px |
| 回归断言 | 原有 CVSS 文本断言改为读取可见数字，避免将 Number Ticker 的读屏文本重复计入；Sheet 宽度断言容纳 0.01px 的浮点边界误差，原布局下限不变（曾观察到 355.999969px 对 356px） |

### 既有 main 的外部状态（不代表本次本地改动已上线）

- 该次外部检查时 GitHub main 为 `353dbe9`；[CI run 40218621131](https://github.com/BlackishGreen33/Argus/actions/runs/40218621131) 为失败：5 个 job 成功，Playwright E2E 为 16 passed、8 failed、2 did not run，并触发 120s 全局超时。登录返回非成功、Admin 恢复失败是已观察现象；本次不修改 CI 配置，也不宣称已定位所有根因。
- Vercel deployment `dpl_GfPh3GFXnwj9bdaKbKgyw4izU8db` 为 Production／Ready，正式域名 `https://argus-vulnerability-triage.vercel.app` 在该部署的 aliases 中。正式 HTTP 200，CSS 包含本轮之前已发布的按钮、身份区、日期单元格及 44px 触控 token。
- 内建浏览器连接持续超时，因此没有完成正式站的交互式视觉实拍；部署、域名和 CSS 证据不能替代该项。正式环境仅做只读检查，没有预览、合并或删除数据。

文件影响判断：更新 [DESIGN.md](../DESIGN.md) 的工作流、CVSS 与动效契约，[README](../README.md) 与 [第三方声明](../THIRD_PARTY_NOTICES.md) 的 Accordion 来源，以及本矩阵、[发布前检查表](./release-checklist.md) 的验证入口。未新增依赖，API、服务端权限、schema、来源 parser、migration、部署配置均未变化，因此不修改其契约，也不执行正式数据库迁移。

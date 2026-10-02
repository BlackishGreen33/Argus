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
| Build            | lint、format、typecheck、unit、production build、E2E                 | package scripts 与 CI                                     | 每个 job 的 run、commit 和环境         |
| 文档             | 路由、命令、路径、链接、权威范围和语言一致                           | `git diff --check` + 链接检查                             | 变更文件、检查命令和未更新理由         |

## 记录状态的规则

- “已覆盖”只说明有测试入口，不代表最近一次通过。
- “已验证”必须同时写日期、commit、运行环境和证据位置。
- 不能引用仓库不存在的脚本；当前 API 验收使用 route 测试、curl 或新增的可追踪测试，并在证据中写出实际入口。
- UI 细节以 [DESIGN.md](../DESIGN.md) 的契约和路线为准；发布是否放行以 [发布前检查表](./release-checklist.md) 为准。
- 测试入口、目录、API 或环境变量发生变化时，按 [AGENTS.md](../AGENTS.md) 同步更新本表。

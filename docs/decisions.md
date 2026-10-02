# Argus 技术决策记录

本文只记录会影响后续实现、迁移、验收或运维的长期选择。当前代码和机器 contract 仍是行为来源；修改决策时要写清影响范围，并同步检查 [README.md](../README.md)、[AGENTS.md](../AGENTS.md) 和测试矩阵。

| ID    | 决策            | 结论                                                                                                       | 取舍与约束                                                                                                          | 代码或配置来源                                                       |
| ----- | --------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| D-001 | Web 构建        | 使用 Next.js 16 App Router 和官方 Turbopack                                                                | 少维护一套构建配置；只有出现可复现的构建瓶颈才重新评估其他 bundler                                                  | `package.json`、`next.config.*`                                      |
| D-002 | 前后端边界      | Next route 只做 adapter；Hono route 按领域放在 `src/server/api/routes`，业务流程放在 `src/server/services` | UI 不能直连数据库；请求、校验、权限和 response contract 留在 API 边界                                               | `src/app/api/[[...route]]/route.ts`、`src/server/api/app.ts`         |
| D-003 | 客户端基础设施  | Axios 负责浏览器请求，TanStack Query 负责远端数据生命周期，Jotai 负责跨页 UI state                         | 不重复实现 request、cache 和全局 UI state；短生命状态留在组件内                                                     | `src/client/http.ts`、`src/client/hooks/`、`src/client/state/`       |
| D-004 | 数据库          | Supabase Postgres + Prisma 7                                                                               | 关系模型适合来源字段、migration、transaction 和 upsert；连接配置分为运行时 `DATABASE_URL` 与 migration `DIRECT_URL` | `prisma/schema.prisma`、`prisma.config.ts`                           |
| D-005 | 认证            | Supabase Auth + `DEMO_MODE`                                                                                | Demo 不因 OAuth 阻塞展示；真实环境由服务端 session 和 `ADMIN_EMAIL` 决定 Admin；前端状态不能授权                    | `src/server/auth.ts`、`src/server/api/routes/auth.routes.ts`         |
| D-006 | 队列与缓存      | QStash、Redis 都是可选整合                                                                                 | QStash 缺失时同步执行 worker；Redis 缺失或失败时回退数据库／内存；两者不能成为普通页面读取的硬依赖                  | `src/server/jobs/qstash.ts`、`src/server/cache/redis.ts`             |
| D-007 | 来源与 CVE 新增 | CVE 只从内置 SQL 导入，不提供人工新增                                                                      | 保留来源 checksum 和可重复 merge，避免人工资料与来源冲突                                                            | `src/server/data/parser.ts`、`src/server/services/import.service.ts` |
| D-008 | 导入安全        | preview、stage rows、transaction merge 和 `sourceMissing` 必须保留                                         | 来源消失时标记，不自动删除；失败 job 不能半合并                                                                     | `prisma/schema.prisma`、`src/server/services/import.service.ts`      |
| D-009 | 审计与删除      | CVE／Component 主数据硬删除前写入 `AuditEvent`                                                             | 满足删除验收并保留最小操作证据；审计记录不能替代数据备份                                                            | `src/server/services/`、`src/server/api/routes/`                     |
| D-010 | CPE 关系        | 前缀匹配只产生候选，默认由 Admin 确认或排除                                                                | UI 明确写“可能关联，需人工确认”；候选不能直接驱动自动修复                                                           | `src/server/services/cve.service.ts`、`src/constants/status.ts`      |
| D-011 | UI 基础         | 使用自有 CSS token 与本地 UI 组件，复用 Radix／React Aria 能力                                             | 不拼装多套完整 UI 库；Rare UI 仅作为来源／授权参考，不是运行时依赖                                                  | `src/app/globals.scss`、`src/components/ui/`                         |
| D-012 | 语言            | 产品 UI 使用简体中文，品牌和展示标题保留英文；仓库 canonical 文档统一简体中文                              | 外部 CVE、PURL、来源描述保留原文；翻译只处理产品文案                                                                | `src/i18n/index.tsx`、`src/i18n/server.ts`                           |
| D-013 | API contract    | 成功响应使用 `{ data, meta? }`，错误响应使用 `{ ok: false, error: { message, details? } }`                 | Zod 在 API 边界验证不可信输入；README 只保留人工可读摘要，OpenAPI 作为辅助入口                                      | `src/server/api/schemas.ts`、`src/server/api/app.ts`                 |

## 决策记录规则

- 新增记录必须说明问题、选择、放弃的替代方案、影响和验证入口。
- 只记录长期取舍。临时 bug、某一轮截图和一次发布结果写入测试或发布记录。
- 当前实现与决策冲突时，先在 [docs/plan.md](./plan.md) 或 issue 中记录差异，再决定修实现或修决策。
- 改变本表后按 [AGENTS.md](../AGENTS.md) 的文件影响矩阵检查 README、DESIGN、测试、风险和发布文档。

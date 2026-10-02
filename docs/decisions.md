# Argus 技术决策记录

| 决策 | 结论 | 取舍 |
| --- | --- | --- |
| Next.js bundler | 使用官方 Turbopack | 减少 Next 16 的额外配置；Rspack／Rsbuild 只有在出现明确构建瓶颈时再评估 |
| 数据库 | Supabase Postgres + Prisma 7.10 | 与 SQL 资料模型匹配，支持 migration／transaction／upsert；需要处理免费层暂停 |
| Queue | Upstash QStash 可选，本地 worker 必须可运行 | 保留真实重试／签名展示点，同时保证课堂无凭证可演示 |
| 认证 | Supabase Auth + DEMO_MODE | 生产使用 HttpOnly session cookie 与 provider；本地演示不因 OAuth 配置阻塞 |
| 前後端邊界 | `src/app/api` 只保留 Next adapter；Hono route 按領域放在 `src/server/api/routes`，業務流程放在 `src/server/services` | 依 Next.js App Router 的 route handler、`src` 與 feature/route 分組建議整理；減少單一 API 檔案與前後端混寫 |
| 客戶端基礎設施 | Axios 統一 API client；TanStack Query 管遠端資料；Jotai 管跨頁 UI state | 使用現有成熟套件，避免重造 request、cache 與全域 state 基礎設施 |
| UI | 自有 CSS token + shadcn 风格，而不是拼装四套库 | 视觉语言统一，减少依赖和样式冲突 |
| CVE 新增 | 不提供人工新增 | 题目要求来源导入，避免人工数据与来源 checksum 冲突 |
| 删除语义 | CVE／Component 主数据硬删除，先写 AuditEvent | 满足作业删除验收，保留最小操作证据 |
| CPE 关系 | 候选＋人工确认 | 前缀匹配可以演示，但不把启发式当作安全事实 |

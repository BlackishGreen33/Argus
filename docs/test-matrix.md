# Argus 测试矩阵

| 层级 | 场景 | 命令／证据 | 状态 |
| --- | --- | --- | --- |
| Parser | 398 Components、1000 CVEs、checksum | `pnpm test -- tests/parser.test.ts` | 已覆盖 |
| Parser | 逗号、转义引号、换行、JSON-like 字段 | Vitest fixture | 已覆盖 |
| API | `/api/health`、`/api/cves`、`/api/search`、`/api/overview` | curl | 已验证 |
| API | Guest GET／Admin mutation | 浏览器 cookie + Hono route | 已验证 Demo mode |
| API | CVE update／delete、Component CRUD | REST acceptance script | 已验证 curl |
| Import | preview 398／1000、stage rows、merge、sourceMissing | `/api/imports` workflow + DB transaction | 已验证 Demo mode 与真实 Postgres |
| DB | migration、seed、重启后读取 | 临时 PostgreSQL 17 容器 + Prisma | 已验证 398／1000、candidate 3576 |
| UI | 双搜索、抽屉状态、Guest banner、Overview 图表 | Playwright | 已编写 smoke |
| UI | Mobile／Tablet／reduced motion | Playwright viewport + 手工 | Mobile 已验证；Tablet／reduced motion 发布前 |
| Build | lint、typecheck、Vitest、Playwright、production build | 本地 Node 24 + GitHub Actions | 已验证本地；CI 已配置 |

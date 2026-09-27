# Argus 发布前检查表

- [x] 中文操作文案为简体中文，品牌与展示标题保持英文。
- [x] 顶部全局搜索与 Triage 列表搜索职责不同，`Cmd/Ctrl + K` 与 `Esc` 可用。
- [x] Guest 只能 GET；Admin mutation、批量状态、导入与合并都通过 API 再验证一次。
- [x] CVE 编辑、删除确认、AuditEvent、Component CRUD 完成演示。
- [x] Overview 图表数字来自 API；Risk Index 标注为工作台排序指标，不等同 CVSS。
- [x] 导入 preview 显示 checksum、398／1000 摘要、差异样本；merge 后 triage status 保留。
- [x] Supabase migration 可重复执行，seed 后重启读取仍存在。
- [x] `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm test:e2e`、`pnpm build` 通过。
- [x] Vercel 环境变量已回读；未配置的 Supabase Auth provider 按决策不启用，相关按钮不显示。
- [x] README、方案、风险、测试、AI log 和飞书文档链接齐全。

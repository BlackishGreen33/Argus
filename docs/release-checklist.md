# Argus 发布前检查表

- [ ] 中文操作文案为简体中文，品牌与展示标题保持英文。
- [ ] 顶部全局搜索与 Triage 列表搜索职责不同，`Cmd/Ctrl + K` 与 `Esc` 可用。
- [ ] Guest 只能 GET；Admin mutation、批量状态、导入与合并都通过 API 再验证一次。
- [ ] CVE 编辑、删除确认、AuditEvent、Component CRUD 完成演示。
- [ ] Overview 图表数字来自 API；Risk Index 标注为工作台排序指标，不等同 CVSS。
- [ ] 导入 preview 显示 checksum、398／1000 摘要、差异样本；merge 后 triage status 保留。
- [ ] Supabase migration 可重复执行，seed 后重启读取仍存在。
- [ ] `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm test:e2e`、`pnpm build` 通过。
- [ ] Vercel 环境变量与 Supabase Auth Provider 配置已回读；未配置 provider 的按钮不显示。
- [ ] README、方案、风险、测试、AI log 和飞书文档链接齐全。

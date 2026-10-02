# Argus 发布前检查表

每次发布复制或清空本表后重新填写。方括号勾选项只代表本次发布，不保留上一轮的完成状态。

| 字段          | 本次记录 |
| ------------- | -------- |
| Commit        | 待填写   |
| 日期与时区    | 待填写   |
| 环境          | 待填写   |
| 操作者        | 待填写   |
| 部署／CI 链接 | 待填写   |
| 测试证据      | 待填写   |

## 代码与构建

- [ ] `pnpm lint`
- [ ] `pnpm format:check`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `pnpm test:e2e`
- [ ] Prisma schema、migration 和 seed 已按本次变更执行必要检查
- [ ] CI 的每个相关 job 都对应本次 commit，失败项已有处理决定

## 运行与权限

- [ ] 生产环境变量来自平台 Secret／Environment Variables，没有提交 `.env.local`、token、密码或数据库 URL
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 没有使用 service role 或 `sb_secret_...`
- [ ] Guest 只能执行只读操作，Admin mutation 由服务端再次验证
- [ ] 登录、登出、身份 loading、失败反馈和权限切换已回读
- [ ] `/api/health`、列表、详情和关键 mutation 已在目标环境回读

## 数据与导入

- [ ] 来源 SQL、parser、checksum、preview、stage rows、merge 和 `sourceMissing` 的受影响路径已测试
- [ ] 合并使用 transaction，失败时没有半合并数据
- [ ] triage 状态和 AuditEvent 的保留语义已验证
- [ ] QStash 配置、签名 key 和公网 `QSTASH_URL` 已按实际部署决定；没有配置时确认同步 fallback
- [ ] Redis 缺失或失败不会阻塞页面读取

## UI 与文档

- [ ] 按 [DESIGN.md](../DESIGN.md) 的受影响路线完成至少一个桌面和一个手机视口走查
- [ ] 检查 console、网络失败、loading／empty／error、键盘、焦点、reduced motion 和无障碍标签
- [ ] 测试证据已写入 [测试矩阵](./test-matrix.md)，包含日期、commit、环境和链接
- [ ] 本次代码、配置、测试和目录变更已按 [AGENTS.md](../AGENTS.md) 判断文档影响
- [ ] README、DESIGN、plan、decisions、risk 和 API 摘要没有重复或过时的当前状态
- [ ] 没有把历史截图、旧勾选或未回读的外部平台状态当成发布证据

## 发布决定

- [ ] 发布
- [ ] 暂缓并记录原因
- [ ] 需要用户或维护者决定

发布决定必须附证据链接和未解决风险；本文件不保存没有上下文的永久完成标记。

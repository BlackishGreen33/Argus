# Argus 风险登记表

| 风险 | 影响 | 可能性 | 预防 | 备选／验收 |
| --- | --- | --- | --- | --- |
| Supabase 免费项目暂停 | 公开演示无法访问数据库 | 中 | README 标注闲置限制；定期演示前唤醒 | `DEMO_MODE=true` 可离线演示 UI 与 API |
| QStash token／签名缺失 | 异步任务无法排队 | 高 | worker 支持本地回退 | 导入仍能 preview；生产再打开签名验证 |
| SQL 转义或字段变化 | 导入数据错位 | 中 | parser 状态机、398／1000 fixture 测试、checksum | 失败 job 保留错误，禁止半合并 |
| 大批量 upsert 超出 serverless 时间 | 合并超时 | 低（课程数据约 1400 行） | preview 与 merge 分开；transaction | 升级为批次 worker，保持 stage schema |
| Admin 环境变量误配 | 访客获得编辑能力 | 低 | API 服务端判断角色；默认 Guest | 发布前用 Guest／Admin API 验收矩阵复测 |
| CPE 启发式误报 | 错误关联组件 | 中 | UI 显示“可能关联，需人工确认” | Admin 可 REJECT；不用于自动修复 |
| UI 视觉依赖过多 | CSS 冲突与维护成本 | 中 | 自有 token，参考而非复制多套库 | 保留 shadcn 基础，逐个移除不必要依赖 |

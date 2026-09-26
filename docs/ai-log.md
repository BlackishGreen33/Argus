# AI 使用记录模板

| 日期 | 工具／模型 | 用途 | 代表性提示词摘要 | 采纳／修改／否决 | 验证方法 |
| --- | --- | --- | --- | --- | --- |
| 2026-09-26 | Codex | 资料模型与技术选型 | 阅读作业说明、SQL 字段与视觉方向，拟定可验收方案 | 采纳 Supabase＋Prisma、Hono、QStash；否决无实体的 Projects | schema、REST 路由、README 验收矩阵 |
| 2026-09-26 | Codex + image generation | 视觉基准 | 生成亮色 evidence-first Triage 列表与详情抽屉 | 采纳完整列表稿；修正截断与双搜索语义 | `public/argus-visual-baseline.png`、UI 手工检查 |
| 2026-09-26 | Codex | 实现与验证 | 先通过 Node 24／pnpm 12，再按里程碑实现 | 对 Prisma 7 新 config、QStash 缺省回退做了修改 | lint、typecheck、Vitest、build、curl |
| 2026-09-26 | Codex + lark-cli | 飞书方案交付 | 按 execution-plan 体裁建立富文本、表格、流程图与视觉基准图 | 采纳亮色基准图与 Mermaid 导入流程；创建后回读并导出资源检查 | 文档 revision 4、outline、表格／图片／画板计数与媒体预览 |

后续每个较大变更追加一行，必须写清“建议是否采纳”以及对应的测试或回读证据。不要把 AI 输出直接当作事实；版本、价格、免费额度使用官方链接复核。

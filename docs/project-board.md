# GitHub Projects 看板建议

建立一个名为 `Argus delivery` 的 Board，固定使用五列：

| 列 | 卡片示例 | 进入条件 |
| --- | --- | --- |
| Backlog | 深色模式、Scalar 文档、Postgres 连接池调优 | 需求已记录，尚未拆出验收 |
| Ready | API 权限矩阵、Component 删除确认、移动端检查 | 验收条件和依赖明确 |
| In Progress | 当前里程碑内的实现任务 | 分支或提交已开始 |
| Review | 代码、截图、测试矩阵待检查 | CI 和本地验证有证据 |
| Done | parser、Triage、导入 preview／merge、CI | 验收清单与文档已回读 |

建议每张卡片都带 `area`、`milestone`、`risk` 标签，并在描述中写“触发动作、预期结果、验证命令”。Board 只管理任务状态；数据库与正式环境状态仍以应用审计和部署回读为准。

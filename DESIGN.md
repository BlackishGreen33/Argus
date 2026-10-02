# Argus UI 设计规范

本文是 Argus 前端的唯一 UI 视觉和交互契约。新页面、组件、文案、状态、动画和响应式行为先满足这里的产品语义，再进入实现。这里记录长期规则与可重跑的 UI 验收路线，不记录某一轮已经完成的截图或测试快照。

## 1. 产品语义与实现边界

Argus 是 Operate 型安全审查工作台。界面优先帮助使用者读证据、做分流决定并确认操作结果。视觉语言采用低饱和工作区、清晰层级和克制动效；装饰不能抢过 CVE ID、标题、严重度、CVSS、状态和来源。

客户端边界如下：

- 页面和 UI 位于 `src/components/` 与 `src/app/`，不能直接读取数据库或 server-only 模块。
- 浏览器请求统一经过 `src/client/http.ts`；TanStack Query 管理远端数据，Jotai 管理跨页 UI 状态，短生命 local state 留在组件内部。
- 文案由 `src/i18n/index.tsx` 和 `src/i18n/server.ts` 提供；业务 TS／TSX 不直接写可见 UI 文案。
- 主题 token 的机器来源是 `src/app/globals.scss`，三种主题由 `src/constants/theme.ts` 定义。本文说明语义，不复制一份可能漂移的 CSS。
- UI 基础组件是仓库中的本地文件，使用 Radix、React Aria 和已有依赖；Rare UI 不是 npm 运行时依赖，来源与授权说明保留在 README。

## 2. 设计原则

1. **证据优先**：CVE ID、标题、严重度、CVSS、状态和来源是第一层信息。
2. **状态可见**：加载、成功、失败、空数据、身份验证中、禁用和选中状态必须有文字或可访问性信息，不能只靠颜色。
3. **动作语义一致**：筛选、排序、关闭、删除、通知和导航使用不同动作名称与图标。
4. **组件优先**：先复用 `src/components/ui` 和已有组件；只有出现真实重复责任时才新增包装。
5. **内容先于装饰**：可见文字、`aria-label`、`title`、placeholder 和 tooltip 都要说明对象或结果。
6. **可恢复**：面板可关闭并从原入口重开；不可逆操作必须确认；不提供没有真实行为的控制。
7. **保持局部性**：键盘、错误和状态处理尽量由负责该交互的组件完成，调用端只传递稳定 props。

## 3. 已确认的界面决策

| 决策       | 实现约束                                                                                                      | 目的                             |
| ---------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 三色主题   | `terracotta`、`olive`、`graphite` 只切换语义 token；边界、文字、背景、焦点和按钮使用 `--app-*` 或 `--accent*` | 主题切换时组件状态保持一致       |
| 渐变       | 只用于访客提示、CVSS 进度等有状态语义的表面，不做卡片装饰                                                     | 保留状态提示，避免降低证据层级   |
| 搜索       | 全局搜索和 Triage 列表筛选分离；清除控制绝对定位，清除时不改变输入宽度                                        | 避免搜索语义混用和列表闪动       |
| 下拉       | Select 与筛选菜单支持外点和 Esc 收起，选中后焦点回到触发器                                                    | 保持浮层行为可预期               |
| 列表       | Guest 不渲染无效 checkbox；Admin 选择后才显示批量操作；点击打开详情，右键／长按打开 ContextMenu               | 每个控制都对应可完成的动作       |
| 严重度     | dot 只在列 hover 时做一次 transform heartbeat；CVSS 环显示比例                                                | 动效只提示交互，数值仍是主要证据 |
| Dialog     | 遮罩点击和 Esc 关闭；关闭后焦点回到来源元素；登录 Dialog 只保留一个标题和主动作                               | 减少重复控件并保持焦点路径       |
| 权限       | 登出或退回 Guest 时清空 CVE 批量选择；Guest 不渲染选择框                                                      | 不把 Admin 暂存动作带入只读状态  |
| 移动侧栏   | 展开时显示导航、设置、帮助和 GitHub；收起时只保留品牌和展开控制                                               | 收展不隐藏必要入口               |
| 移动列表   | 保留严重度、CVE、标题、组件、CVSS、日期和状态；标题最多两行                                                   | 小屏仍能完成分流判断             |
| 表单       | 登录密码可显示／隐藏；字段有清晰 label、错误、保存中和成功状态                                                | 让数据状态和下一步动作可见       |
| 破坏性操作 | Component 和 CVE 删除先确认，取消后编辑器与数据不变                                                           | 避免误触丢失数据                 |
| 反馈       | Toast 固定在右下角；成功、失败、空、加载和权限状态各自有文字或可访问性信息                                    | 反馈不遮挡顶部身份控制           |

## 4. 文案与语系契约

- UI、错误、表单、placeholder、tooltip、`title`、`aria-label`、toast 和候选关系原因使用简体中文；`Argus`、`Triage`、`Overview`、`History`、`Components` 等展示标题保留英文。
- `zh-CN` 是默认语系，设置中提供 `zh-CN`、`zh-TW`、`en`。选择结果写入 `argus_locale`，同步更新 `html[lang]`；日期使用 `Intl.DateTimeFormat(locale, ...)`。
- CVE、PURL、包名、来源描述和外部字段保留原文，不把外部资料当成 UI 文案翻译。
- Server／API 使用 `src/i18n/server.ts`；Client 使用 `useI18n().t(key, values)`。修改文案时检查窄屏换行、日期、空／错误状态和 icon-only 标签。
- 文案说明结果，不描述内部实现。例如写“数据刷新已排队”，不要写“QStash 请求已发送”。

## 5. 设计 token

精确值以 `src/app/globals.scss` 为准。新增 token 必须同时更新该文件、主题定义和本文的语义说明。

### 字体

| 用途       | 规则                                                                  |
| ---------- | --------------------------------------------------------------------- |
| 界面与数据 | Geist，中文回退系统黑体、Noto Sans SC 或 PingFang SC；默认 14px／1.45 |
| 展示标题   | 单一 sans 字体；标题使用较大字级和紧凑行高，但不能挤压数据            |
| 辅助文字   | 11–13px／1.45，只承载次要信息，不能成为唯一操作说明                   |
| 键盘提示   | 使用 `kbd` token，保持单行                                            |

不要用 10px 以下文字承载可操作信息，不用衬线长段落抢过 CVE 证据，不用全大写中文。

### 色彩语义

| Token 类别                                                    | 允许用途                               |
| ------------------------------------------------------------- | -------------------------------------- |
| `--app-canvas`、`--app-surface`、`--app-surface-soft`         | 工作区、表格、卡片、Sheet 和 Dialog    |
| `--app-line`、`--ink`、`--ink-soft`、`--ink-faint`            | 边界、主要文字、辅助文字和 placeholder |
| `--app-sidebar`、`--accent`、`--accent-deep`、`--accent-soft` | 导航、主要动作、焦点替代色和选中表面   |
| `--critical`、`--high`、`--medium`、`--low`、`--ok`           | 严重度和成功状态                       |

严重度色只表示资料严重度，不表示排序、hover 或成功；错误必须同时提供文字和 `aria-live`／`role="alert"`。低对比文字不能用于按钮、label、表头或唯一状态描述。新增主题必须补齐画布、表面、文字、边界、accent 和 focus token。

### 尺寸、圆角与阴影

- 基准间距为 4px；优先使用 Tailwind spacing token，跨组件规则才写入 SCSS。
- `space-1` 到 `space-9` 依次服务于图标间距、控制组、label、卡片、区段、页面内距和清除控制保留区。
- 桌面表格列高由当前实现保持一致；移动端卡片保留足够内容高度，不能依赖水平滚动。
- 小控制和 badge 使用小圆角；button、input、select 使用中等圆角；panel、sheet、dialog 使用较大圆角。
- Portal 内容必须有不透明背景；不要用多层阴影制造浮雕效果。

## 6. 组件与状态契约

### 搜索、筛选与排序

- 顶部搜索是全局命令入口，搜索 CVE、Component 和 PURL；`Cmd/Ctrl + K` 打开居中的 Command。
- Triage 搜索只筛选当前漏洞列表，两套 state 不共享。
- 筛选触发器写“严重度”，未选择写“全部严重度”，选项只写“严重／高／中／低”。
- 排序是独立动作，使用清晰箭头和 `aria-sort`，不藏在筛选菜单里。
- 只有存在条件时才启用清除筛选；清除不会额外改变输入框宽度。

### 表格、列表与 ContextMenu

- 桌面使用本地 Table 组件，表头、列宽和列高稳定；长文字使用 ellipsis 和 `title`。
- 默认每页 10 条，footer 数量必须等于当前渲染数量，骨架不能多生成行。
- CVE 行没有独立操作栏；桌面右键、触控长按打开 ContextMenu，行点击打开详情。
- 移动端改为卡片或列表，不要求横向滚动才能看到 CVE ID、标题、组件、严重度、CVSS、日期和状态。
- checkbox 只负责批量选择；选中行提供 `aria-selected` 或等价状态。

### Sheet、Dialog 与 Command

- CVE 详情使用右侧 Sheet；桌面与移动端宽度以当前 CSS 和浏览器验证为准。
- Sheet、Dialog 必须有 Title 和 Description；视觉隐藏也要保留语义。
- 打开、关闭和遮罩动画支持 `prefers-reduced-motion`；focus trap、Esc 和关闭后焦点回收必须有效。
- 登录 Dialog 只展示一个“登录”标题，密码提供显示／隐藏控制；未配置的社交登录整段不渲染。
- Command 在视窗中心定位，输入框不叠加额外橙色 outline。
- 通知面板的“关闭面板”只关闭当前 Sheet；如果没有静音行为，不得写“关闭通知”。

### 表单、权限与反馈

- 每个字段有可见 label 或 `aria-label`；错误靠近字段，使用 `aria-invalid`。
- Guest、Admin 和身份验证中是三种不同状态；身份查询未完成时显示“验证中”，不能先显示 Guest 限制再跳成 Admin。
- `/api/auth/me` 的服务端结果是权限事实来源；localStorage 不能作为授权依据。
- TanStack Query 负责 loading、error、invalidation；登录／登出后更新或失效 user query。
- 自写模块保持明确 props 和单一责任；文件行数上限由 `eslint.config.mjs` 的 650 行规则执行，`src/components/ui/**` 不受该规则限制。

## 7. 响应式契约

断点和精确尺寸以 `src/app/globals.scss` 为机器来源，浏览器验证以 [测试矩阵](./docs/test-matrix.md) 的运行记录为准。稳定要求如下：

- 桌面：侧栏、主内容和右侧详情保持层级；表格列对齐，首屏能看到导航和主要操作。
- 平板：侧栏可以折叠；图标有 tooltip，文字不裁切，Sheet 不遮住关闭入口。
- 手机：侧栏转为顶部品牌列，列表卡片化，Sheet 全宽；首屏同时能找到导航和搜索。
- 极窄屏：筛选控件换行，操作按钮满宽或网格化；中英混排不重叠，触控目标至少 44px。
- 侧栏控制文案随状态变化，展开与折叠不能只靠图标猜测。

## 8. 动效契约

- 页面或区块进入使用短时 opacity 和轻微位移；Sheet、Dialog、Command 的时长保持克制。
- hover／pressed 只反馈一次动作，不使用持续闪烁或无意义旋转。
- 严重度 dot 只在列 hover 时做 transform heartbeat，不动画 box-shadow、filter 或多层光晕。
- `prefers-reduced-motion: reduce` 时取消位移和非必要动画，保留状态变化与可访问性信息。
- 动效只表达出现、消失、状态改变或等待，不能遮盖加载延迟。

## 9. 可访问性与输入

- 所有交互元素可用 Tab／Shift+Tab 到达，Enter／Space 行为一致；Esc 关闭所有可关闭面板。
- Focus 必须可见，不使用与主题冲突的橙色双重框。
- Dialog、Sheet 和 ContextMenu 打开时焦点进入内容，关闭后回到触发元素或原列表行。
- 对比度达到 WCAG 2.2 AA；状态同时提供文字、形状或图标。
- 触控目标至少 44×44px；长按操作必须有可见 ContextMenu，不能只依赖 hover。

## 10. UI 走查路线

每次 UI 变更都要按受影响路线走查；自动化重复断言，浏览器检查负责视觉层级、焦点和真实状态。

| 路线         | 入口                                   | 必查内容                                                        |
| ------------ | -------------------------------------- | --------------------------------------------------------------- |
| 首屏         | `/` 硬刷新                             | 身份 loading、Guest／Admin 稳定显示、无空白和 framework overlay |
| 全局搜索     | 顶部输入、`Cmd/Ctrl+K`                 | 中心定位、结果语义、Esc、焦点回收                               |
| Triage       | 列表搜索和筛选                         | 搜索与筛选分工、清除、外点收起、分状态和空结果                  |
| 表格         | 桌面右键、手机长按                     | 分页、列高、ContextMenu、复制与详情                             |
| 详情         | 右侧 Sheet                             | Overview、Impact、History、状态修改、来源、删除确认             |
| Components   | 搜索、类型、编辑、新增、删除           | Guest／Admin、字段校验、加载／空／错、PURL 约束                 |
| Overview     | 刷新内置数据、导入状态                 | 真实计数、preview、merge、失败、重试、Risk Index 语义           |
| 设置         | 主题、语言、侧栏                       | 主题和 locale 持久化、`html[lang]`、日期和导航                  |
| 通知与帮助   | 铃铛、Help                             | 面板可重开、空状态、链接正确且不重复                            |
| 登录         | 顶部身份入口                           | 遮罩／Esc、密码切换、提交 loading、成功反馈、登出后清空选择     |
| 键盘与响应式 | Tab、Enter、Space、Esc；桌面和手机视口 | 焦点顺序、无键盘陷阱、无水平溢出、触控可用                      |

## 11. 交付门槛

按变更范围执行：

1. 运行相关的 `pnpm lint`、`pnpm format:check`、`pnpm typecheck`、`pnpm test`、`pnpm build` 和 `pnpm test:e2e`。
2. 使用真实浏览器检查受影响路线，至少覆盖一个桌面和一个手机视口。
3. 检查 console、网络失败、loading／empty／error、键盘、权限和 reduced motion。
4. 将结果按日期、commit、环境和证据写入 [测试矩阵](./docs/test-matrix.md) 或 [发布前检查表](./docs/release-checklist.md)；本文不保存一轮测试的永久勾选。

## 12. 当前待核对差异

以下项目不能在没有代码或浏览器证据时直接改成确定性规则。核对后只更新本节和对应的契约，不把历史快照放回本文。

| 项目               | 当前文档表述                                  | 机器来源                                              | 处理方式                             |
| ------------------ | --------------------------------------------- | ----------------------------------------------------- | ------------------------------------ |
| 标题字级           | 旧表述为 H1 42–58px                           | `src/app/globals.scss`                                | 以 CSS 与浏览器结果校准              |
| Sheet／Dialog 位移 | 旧表述为 12px、0.98→1                         | `src/app/globals.scss`、`src/components/ui/sheet.tsx` | 以实际动效检查后更新                 |
| 响应式断点         | 文档与 CSS 可能使用不同断点                   | `src/app/globals.scss`                                | 以实际布局和浏览器路线为准           |
| token 清单         | 文档可能漏掉 `--app-surface-alt` 等实际 token | `src/app/globals.scss`                                | 逐项核对后补齐                       |
| UI 行为证据        | 旧文档曾写特定视口的完成结果                  | `e2e/`、浏览器记录                                    | 移到带日期和 commit 的测试／发布记录 |

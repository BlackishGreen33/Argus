<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 專案邊界

Argus 是給 DevSecOps／安全審查人員使用的漏洞分流工作台。它把匯入的 CVE、Component 與候選關聯整理成可搜尋、可修改、可追溯的工作流；它不是 Agent 產品，也不在本作業中加入自動修復或聊天能力。

- 中文 UI、錯誤訊息、表單標籤使用簡體中文；`Argus`、`Triage`、`Overview`、`History` 等品牌或展示標題保留英文。
- `Guest` 只能瀏覽、搜尋與查看詳情；`Admin` 才能修改、刪除、管理 Component、批量改狀態與執行匯入。
- 頂部搜索是跨頁命令入口，可搜尋 CVE、Component、PURL；Triage 內搜索只篩選目前列表，不能混用兩者語義。
- CVE 只從內建 SQL 匯入，不提供人工新增；Component 提供完整 CRUD。
- 詳情抽屜內可快速修改 triage 狀態，`History` 只展示狀態、時間與操作者。

## 技術基線

- Node.js 24、pnpm 12.6.0、Next.js 16 App Router、Turbopack、Tailwind CSS。
- Hono REST API 掛在 `src/app/api/[[...route]]/route.ts`，輸入在 API 邊界用 Zod 驗證。
- Supabase Postgres + Prisma 7；Supabase Auth 使用 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`，不使用 service role key 或 `sb_secret`。
- QStash 與 Upstash Redis 都是可選整合。QStash 未配置時匯入改走同步 fallback，Redis 缺失時不能阻塞頁面瀏覽。
- Vercel Hobby 是展示部署目標；公開環境的變量只能在平台 Secret／Environment Variables 中配置。

## 目錄與依賴方向

```text
src/
├── app/          # Next 路由、layout、全局樣式；不放領域資料存取
├── components/   # 可組合的 UI 與頁面切片
├── hooks/        # Client state、快捷鍵與交互副作用
├── libs/         # Prisma、Supabase、QStash、parser、store 等服務整合
├── types/        # domain 與 UI contract
└── utils/        # 純函數、HTTP client、格式化與文案映射
```

Client component 不得直接 import `prisma`、Node.js API 或 server-only store；跨邊界必須經 `/api/*`。`NEXT_PUBLIC_*` 只存放可公開值，所有資料庫連線、QStash token 與管理員設定只在 server 端讀取。

## 資料與安全規則

- Prisma migration 必須可重複執行；匯入 parser 需保留 checksum、preview、merge transaction 與 `sourceMissing`，不因來源消失自動刪除資料。
- 修改、刪除、狀態變更、匯入、合併與批量操作都要寫入 `AuditEvent`。
- API 回應維持 `{ data }` 或 `{ ok: false, error: { message } }` 形狀；前端不繞過 API 直接讀資料庫。
- 任何來自 URL、表單、匯入檔案或 webhook 的輸入都視為不可信；不要以型別斷言取代執行期驗證。
- `QSTASH_CURRENT_SIGNING_KEY` 與 `QSTASH_NEXT_SIGNING_KEY` 成對存在時才驗證簽名；未配置時保留本地／展示 fallback，不得讓一般啟動失敗。

## 開發與驗證

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

資料庫相關變更另外執行 `pnpm prisma validate`、`pnpm db:migrate` 與必要的 seed。修改 API、資料模型、環境變量或目錄結構時，同步更新 README、docs 與 `.env.example`；不得提交 `.env.local`、token、密碼、資料庫 URL 或生成的 `src/generated`。

## 變更規則

- 先讀取受影響模組、測試與本檔，再做最小必要修改；不要為了順手重排無關檔案。
- 保留使用者已刪除的 `CLAUDE.md`，不要重新建立。
- 新增提交必須使用 `<emoji> <type>(<scope>): <desc>`，例如 `🚀 ci(workflow): split checks into focused jobs`；提交前用 git-workflow 的 validator 驗證。
- CI job 要按責任拆分，名稱必須讓失敗位置可直接辨識；本地與 CI 使用相同的 pnpm scripts。
- 完成前必須回看 `git diff`、執行與變更風險相稱的檢查，不能用未執行的命令宣稱通過。

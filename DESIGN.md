# Argus UI 設計規範

本文件是 Argus 前端的唯一視覺與互動規範。所有新頁面、元件、文案、狀態、動畫與響應式行為都必須先符合本文件，再進入實作。若現有程式與本文件衝突，以本文件為準並建立缺陷紀錄；不以「只是展示」作為例外。

Argus 面向 DevSecOps／安全審查人員。介面要讓人快速讀懂證據、做出分流決策並知道操作結果。視覺語言是 evidence-first：暖白紙面、低飽和色彩、清楚層級、克制動效；不使用裝飾性漸層、無語意的動態或會掩蓋資料的高對比效果。

## 1. 設計原則

1. **證據優先**：CVE ID、標題、嚴重度、CVSS、狀態與來源是第一層資訊；裝飾不能搶過它們。
2. **狀態必須可見**：載入、成功、失敗、空資料、未驗證身份、禁用與選中都要有文字或可及性狀態，不依賴顏色單獨傳達。
3. **動作與語意一致**：篩選、排序、關閉面板、停用通知、刪除資料是不同動作，不能共用含義模糊的按鈕或圖示。
4. **組件優先**：先使用 `src/components/ui` 的 shadcn／Radix 產物與已安裝的 Rare UI 元件；只有沒有合適介面時才新增自寫元件。
5. **少而深的介面**：自寫模組提供小型、穩定的 interface，將狀態、鍵盤與錯誤處理留在模組內，讓呼叫端保持 locality。
6. **內容先於裝飾**：每個可見文字、`aria-label`、`title`、placeholder 和 tooltip 都要回答「這是什麼」或「會發生什麼」。
7. **可回復**：面板可關閉也可由原入口重開；不可逆操作要先確認；不提供沒有實際行為的控制。

## 2. 設計 token

### 2.1 字體

| 用途 | 字體 | 字級／行高 | 使用規則 |
| --- | --- | --- | --- |
| 介面與資料 | Geist，中文 fallback 為系統黑體／`Noto Sans SC`／`PingFang SC` | 14px／1.45 | 所有按鈕、表單、表格、提示、導航使用此層 |
| 展示標題 | Instrument Serif，中文 fallback 為 `Songti SC`／Georgia | H1 52–82px／1.0；H2 28–36px／1.15 | 只用於頁面主標題與詳情標題，不用於資料欄位或按鈕 |
| 小標籤 | Geist | 11px／1.3，字距 0.13em | 僅用 `.eyebrow`、section label；必須搭配明確正文 |
| 輔助文字 | Geist | 11–13px／1.45 | 只能承載次要資訊，不能放唯一的操作說明 |
| 鍵盤提示 | Geist | 11px／1.2 | 使用 `kbd` token，保持單行 |

禁止：用全大寫中文、用 Instrument Serif 顯示長段落、用 10px 以下字級承載可操作資訊、讓英文下伸部位壓住下一行。標題與副標題之間至少保留 `space-3`（12px）視覺間距。

### 2.2 色彩

以下 token 定義在 `src/app/globals.scss`。元件只能使用語意 token，不直接寫新的色碼。

| Token | 預設值 | 語意 | 允許用途 |
| --- | --- | --- | --- |
| `--canvas` | `#f5f2ed` | 工作區底色 | body、頁面背景 |
| `--surface` | `#fbfaf7` | 卡片、表格、面板 | 內容表面 |
| `--surface-muted` | `#efebe5` | 次級表面 | hover、選中背景、kbd |
| `--surface-strong` | `#e4dfd8` | 強調表面 | active 導航、主要區塊 |
| `--ink` | `#272724` | 主要文字 | 標題、資料、主要按鈕文字 |
| `--ink-soft` | `#62605b` | 次級文字 | 描述、日期、輔助說明 |
| `--ink-faint` | `#8f8b84` | 弱化文字 | placeholder、非主要提示 |
| `--line` | `rgba(39,39,36,.13)` | 邊界 | divider、輸入框、表格分隔 |
| `--accent` | `#a84d32` | 當前主題動作色 | primary button、active tab、焦點替代色 |
| `--accent-deep` | `#7c3525` | 主題深色 | active 文字、hover |
| `--accent-soft` | `#f3dfd7` | 主題淡色 | selected item、狀態背景 |
| `--critical` | `#a83f24` | 嚴重 | severity dot／badge；不能表示成功 |
| `--high` | `#bd5f32` | 高 | severity dot／badge |
| `--medium` | `#c69b31` | 中 | severity dot／badge |
| `--low` | `#778b67` | 低 | severity dot／badge |
| `--ok` | `#5e806b` | 已確認／成功 | success badge、完成提示 |

色彩規則：

- 嚴重度色只表示資料嚴重度，不表示排序方向、互動 hover 或成功。
- `--accent` 表示目前主題下的主要動作，不等於風險等級。
- 錯誤必須同時有文字與 `aria-live`／`role="alert"`；不能只使用紅色。
- 低對比的 `--ink-faint` 不得用於按鈕、表單 label、表格標題或唯一的狀態描述。
- 主題切換只修改既有 token；新增主題必須同時定義 `canvas`、`surface`、`surface-muted`、`surface-strong`、`ink`、`ink-soft`、`ink-faint`、`line`、`accent`、`accent-deep`、`accent-soft` 和 `ring`。

### 2.3 間距與尺寸

基準單位為 4px。優先使用 Tailwind spacing token；SCSS 只處理跨元件或 portal 無法以 utility 表達的規則。

| Token | 值 | 使用 |
| --- | --- | --- |
| `space-1` | 4px | 圖示與文字、badge 內部 |
| `space-2` | 8px | 同組控制項、表格次級欄 |
| `space-3` | 12px | label 與控制、標題與副標題 |
| `space-4` | 16px | 卡片內距、欄間距、面板內距 |
| `space-5` | 20px | 主要區塊垂直間距 |
| `space-6` | 24px | 頁面區段、篩選列上下間距 |
| `space-8` | 32px | 頁面標題與主內容 |
| `space-10` | 40px | 大型展示區段 |

表格列高桌面固定 64px；載入骨架必須使用相同列高。手機卡片最小 86px，卡片之間 8px。任何單行操作列不得因圖示或文字換行而改變相鄰列的 baseline。

### 2.4 圓角與陰影

| 用途 | 圓角 | 陰影／邊界 |
| --- | --- | --- |
| 小控制、badge、kbd | 5–8px | `--line` |
| button、input、select | 8–10px | 1px `--line` |
| panel、card、sheet | 10–14px | `--shadow` 或 1px `--line` |
| dialog、command palette | 14–18px | `--shadow` + 不透明 `--surface` |

不要用多層陰影製造浮雕效果。Portal 內容必須有不透明背景，避免底層表格透出造成文字混疊。

## 3. 元件與狀態契約

### 3.1 自寫元件

自寫前端元件一律使用：

```tsx
interface ExampleProps {
  label: string;
}

const Example: React.FC<ExampleProps> = ({ label }) => {
  return <span>{label}</span>;
};
```

禁止使用 `function Component()`、在參數列內聯 props 型別、或把沒有實際行為的 wrapper 抽象成新模組。`src/components/ui/**` 的 shadcn／Radix／Rare UI 產物是外部生成模組，保留其來源格式；使用它們時只在業務包裝層遵守本契約。

自寫檔案的 ESLint `max-lines` 上限為 650 行（跳過空白與註解，生成 UI 目錄除外）。超過上限要先刪除重複責任或形成真正的深模組，再拆檔；不以任意切片湊行數。

### 3.2 按鈕

- `Button` 用於有明確動作；文字以動詞開頭，例如「保存修改」「刷新内建数据」「关闭面板」。
- 主要動作只有一個 accent button；次要動作用 outline／ghost。
- destructive 動作必須經 `AlertDialog` 或 Rare UI Delete Button 確認。
- 請求中使用 disabled + `Spinner`／明確文字；不能讓使用者重複提交。
- 沒有行為的視覺元素用普通文字或 `aria-hidden`，不要做成可點按鈕。

### 3.3 搜索、篩選與排序

- 頂部搜索是全局命令入口，可搜尋 CVE、Component、PURL；`Cmd/Ctrl + K` 開啟 `Command` inside `Dialog`。
- Triage 內搜索只篩選目前漏洞列表；兩者 state 不共享。
- 篩選維度與選項不可混用：觸發器寫「严重度」，未選狀態選項寫「全部严重度」，選項只寫「严重／高／中／低」。
- 「升序／降序」是排序語意，必須使用獨立的排序按鈕或 menu，帶明確箭頭與 `aria-sort`；不可藏進篩選選單。
- 清除篩選使用 `FilterX` 加「清除筛选」，不是調整滑桿圖示；有篩選時才啟用或顯示結果提示。

### 3.4 表格與列表

- 桌面使用 shadcn `Table`；表頭、欄寬、列高固定，長文字以 ellipsis + `title`，不能造成行高漂移。
- 每頁預設 10 筆，footer 的實際數量必須等於渲染列數；載入骨架也只能生成當前 page size。
- CVE 行沒有獨立操作欄；桌面右鍵、觸控長按開啟 shadcn `ContextMenu`。列表行可點開詳情，ContextMenu 提供「查看详情」「复制 CVE ID」。
- 手機轉為卡片行，不要求使用者水平滾動才能看到 CVE ID、標題、嚴重度與狀態。
- 行的 checkbox 只負責批量選擇；選中行要有 `aria-selected` 或等價可及性訊息。

### 3.5 Sheet、Dialog、Command

- CVE 詳情使用 `Sheet side="right"`；桌面寬度 430px 以內，手機為全寬。
- Sheet／Dialog 必須有 `Title` 和 `Description`；視覺隱藏仍需保留語意。
- 打開／關閉使用 180–220ms opacity + translate 動效；支援 `prefers-reduced-motion`。
- 背景遮罩必須不透明到足以辨識前景；focus trap、Esc 關閉、關閉後焦點回到觸發元素。
- Command palette 使用畫面中心定位，不依賴首次渲染後的 JS 位置修正；內層 input 不使用橘色 outline 疊加。
- 通知面板的「关闭面板」只關閉當前 Sheet；顶部铃铛始终可以重新打开。若未实现静音状态，不得写「关闭通知」。

### 3.6 表單、狀態與反饋

- 每個欄位都有可見 label 或 `aria-label`；錯誤文字靠近欄位並使用 `aria-invalid`。
- 必填、格式錯誤、保存中、成功、失敗、空資料與載入中都要有明確文字。
- Guest、Admin、身份驗證中是三種不同狀態；身份查詢未完成時顯示「验证中」與 loading，不能先顯示 Guest 寫入限制再跳成 Admin。
- `/api/auth/me` 的服務端結果是權限事實來源；localStorage 只能保存 access token 與非安全性的 UI hint，不得作為授權依據。
- TanStack Query 管理請求快取、loading、error 與 invalidation；登入／登出後更新或失效 user query。

## 4. 響應式規範

| 斷點 | 佈局 | 必須驗收 |
| --- | --- | --- |
| `> 1200px` | 218px 側欄 + 主內容；詳情右側 Sheet | 表格欄位對齊、首屏可見頂欄、無水平溢出 |
| `841–1200px` | 側欄可折疊為 76px；主內容縮窄 | 圖示有 tooltip、文字不被裁切、Sheet 不蓋住關閉按鈕 |
| `≤ 840px` | 側欄轉為頂部導覽；列表卡片化；Sheet 全寬 | 首屏有導航與搜索；不需要滾到底才看得到操作；沒有水平溢出 |
| `≤ 480px` | 篩選控制換行；按鈕滿寬或成網格 | 中文與英文混排不重疊，觸控目標至少 40px |

側欄控制的文案必須隨狀態改變：折疊時為「展开侧栏」，展開時為「折叠侧栏」；設定中的 Switch 顯示「已折叠／已展开」，不能只寫「展开」。

## 5. 動效規範

- 進入頁面／區塊：opacity 0→1、translateY 6px→0，180ms，ease-out。
- Sheet：從對應邊緣 translate 12px→0，200ms；遮罩 160ms。
- Dialog／Command：opacity + scale 0.98→1，180ms。
- hover／pressed：100–140ms；不使用持續閃爍或無限旋轉（載入 spinner 除外）。
- `prefers-reduced-motion: reduce` 時取消位移與非必要動畫，保留狀態變化與可及性。
- 動效只表達「出現、消失、狀態改變、等待」，不能用來掩蓋載入或延遲。

## 6. 文案與圖示

- UI、錯誤、表單、aria 文案使用簡體中文；品牌與展示標題保留 `Argus`、`Triage`、`Overview`、`History`、`Components`。
- 文案說明結果，不描述實作。例如寫「数据刷新已排队」，不要寫「QStash 请求已发送」。
- `Search` 表示搜尋，`FilterX` 表示清除篩選，`PanelLeft`／`Menu` 表示側欄狀態，`Bell` 表示可打開通知中心。
- 圖示不能單獨承擔唯一語意；icon-only button 必須有 `aria-label` 和 tooltip。
- 日期、狀態、嚴重度、來源名稱與 PURL 等資料優先保持單行；超長值使用 ellipsis 或換行容器，不把鄰近欄位推開。

## 7. 可及性與輸入

- 所有可互動元素可用 Tab／Shift+Tab 到達，Enter／Space 行為一致；Esc 關閉所有可關閉面板。
- Focus 必須可見且不使用與主題衝突的橘色雙重框；輸入框內外只保留一層清晰焦點。
- Dialog／Sheet 開啟時 focus 進入內容，關閉後回到觸發按鈕；ContextMenu 關閉後回到原列表行。
- 顏色對比需符合 WCAG 2.2 AA；狀態同時提供文字、形狀或圖示。
- 觸控目標至少 40×40px；長按操作需有可見的 ContextMenu，不能只依賴 hover。

## 8. UI 走查與測試矩陣

每次變更都要按下列路線實際走查；自動化只負責重複驗證，不取代 Chrome 視覺確認。

| 路線 | 入口 | 斷言 |
| --- | --- | --- |
| 首屏 | `/` 硬刷新 | 先有身份 loading，再穩定顯示 Guest／Admin；無跳變、無空白、無 framework overlay |
| 全局搜索 | 頂部 input、`Cmd/Ctrl+K` | 中心定位、動畫、結果語意、Esc、焦點回收、無橘框 |
| Triage | 列表搜索、严重度／生态系／状态 | 篩選維度與選項清楚；「全部严重度」恢復全量；清除篩選有效 |
| 表格 | 桌面右鍵、手機長按 | 10 筆分頁、列高一致、ContextMenu 可用、複製與查看詳情可用 |
| 詳情 | 右側 Sheet | Overview／Impact／History、狀態快速修改、來源、刪除確認、Esc、入退場動畫 |
| Components | 搜索、类型、編輯、新增／刪除 | Guest／Admin 權限、空／錯誤／載入、表單校驗、PURL 鎖定 |
| Overview | 刷新內建資料、導入狀態 | 真實計數、loading、預覽、合併／失敗／重試、Risk Index 語意 |
| 設定 | 主題色、側欄 Switch | 三種主題改變 token 並持久化；「展开侧栏／折叠侧栏」操作可理解 |
| 通知 | 鈴鐺、关闭面板 | 面板內容有意義；关闭面板後鈴鐺可重開；空狀態與事件列表一致 |
| 幫助 | Help、API／README 連結、GitHub | 連結可用、只保留一個 GitHub 入口、文本不誤導 |
| 鍵盤 | Tab、Enter、Space、Esc | focus 順序、焦點回收、無鍵盤陷阱 |
| 響應式 | 1440×1000、1024×900、640×800、390×844 | 首屏導航、無水平溢出、Sheet／卡片／篩選可用 |

小圖示走查：每個 icon-only 元件逐一檢查 `aria-label`、tooltip、按下／禁用／hover／focus、游標、尺寸與 baseline。沒有互動行為的圖示使用 `aria-hidden="true"`，保持預設游標，不偽裝成按鈕。

## 9. 交付門檻

交付前必須完成：

1. `pnpm lint`、`pnpm format:check`、`pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm test:e2e`。
2. 使用安裝的 Google Chrome 實際走查本文件第 8 節所有路線，至少包含桌面與手機視口。
3. 檢查瀏覽器 console error／warning、網路失敗、loading／empty／error、鍵盤與 reduced motion。
4. 確認 `DESIGN.md`、Feishu 實時 TODO、README 與程式行為一致；若仍有語意不清或未驗證項目，不得宣稱完成。


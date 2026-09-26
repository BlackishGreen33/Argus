"use client";

import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Boxes,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Command,
  FileSearch,
  Filter,
  History,
  LayoutList,
  Lock,
  LogIn,
  LogOut,
  Menu,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentRecord, CveRecord, ImportJob, OverviewData, TriageStatus } from "@/app/lib/types";

type Page = "triage" | "components" | "overview";
type DrawerTab = "Overview" | "Impact" | "History";
type GlobalResult = { type: "CVE" | "Component"; label: string; sublabel: string; target: string };

const statusLabels: Record<TriageStatus, string> = {
  PENDING: "待处理",
  CONFIRMED: "已确认",
  DEFERRED: "已延后",
  FALSE_POSITIVE: "误报",
};

const severityLabels: Record<string, string> = { CRITICAL: "严重", HIGH: "高", MEDIUM: "中", LOW: "低" };

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? window.localStorage.getItem("argus_access_token") : null;
  const response = await fetch(url, { ...init, credentials: "include", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...(init?.headers ?? {}) } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.message ?? "请求失败");
  return payload;
}

function statusClass(status: string) {
  return status.replaceAll("_", " ");
}

export function ArgusApp() {
  const [page, setPage] = useState<Page>("triage");
  const [cves, setCves] = useState<CveRecord[]>([]);
  const [components, setComponents] = useState<ComponentRecord[]>([]);
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [selected, setSelected] = useState<CveRecord | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("Overview");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [localQuery, setLocalQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ecosystemFilter, setEcosystemFilter] = useState("");
  const [globalQuery, setGlobalQuery] = useState("");
  const [globalResults, setGlobalResults] = useState<GlobalResult[]>([]);
  const [commandOpen, setCommandOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("guest@argus.local");
  const [loginOpen, setLoginOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [componentEditorOpen, setComponentEditorOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<ComponentRecord | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  };

  const loadData = async (query = localQuery, filterOverrides?: Partial<{ severity: string; status: string; ecosystem: string }>) => {
    const filters = { severity: severityFilter, status: statusFilter, ecosystem: ecosystemFilter, ...filterOverrides };
    setLoading(true);
    setError(null);
    try {
      const [cveResponse, componentResponse, overviewResponse, userResponse] = await Promise.all([
        request<{ data: CveRecord[] }>(`/api/cves?query=${encodeURIComponent(query)}&pageSize=50${filters.severity ? `&severity=${filters.severity}` : ""}${filters.status ? `&status=${filters.status}` : ""}${filters.ecosystem ? `&ecosystem=${filters.ecosystem}` : ""}`),
        request<{ data: ComponentRecord[] }>("/api/components"),
        request<{ data: OverviewData }>("/api/overview"),
        request<{ data: { email: string; role: string } }>("/api/auth/me"),
      ]);
      setCves(cveResponse.data);
      setComponents(componentResponse.data);
      setOverviewData(overviewResponse.data);
      setIsAdmin(userResponse.data.role === "admin");
      setAdminEmail(userResponse.data.email);
      if (selected) {
        const refreshed = cveResponse.data.find((item) => item.cveId === selected.cveId);
        if (refreshed) setSelected(refreshed);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  // The first request intentionally uses an empty query; later list searches call loadData(value).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadData(""); }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === "Escape") {
        setCommandOpen(false);
        setDrawerOpen(false);
        setEditorOpen(false);
        setLoginOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const openCve = (cve: CveRecord) => {
    setSelected(cve);
    setDrawerTab("Overview");
    setDrawerOpen(true);
    setCommandOpen(false);
  };

  const updateLocalCve = (next: CveRecord) => {
    setCves((current) => current.map((item) => (item.cveId === next.cveId ? next : item)));
    setSelected(next);
    setOverviewData(null);
    void loadData();
  };

  const changeStatus = async (cveId: string, status: TriageStatus) => {
    try {
      const response = await request<{ data: CveRecord }>(`/api/cves/${encodeURIComponent(cveId)}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      updateLocalCve(response.data);
      notify(`状态已更新为「${statusLabels[status]}」`);
    } catch (requestError) {
      notify(requestError instanceof Error ? requestError.message : "状态更新失败");
    }
  };

  const batchStatus = async (status: TriageStatus) => {
    if (!selectedIds.length) return;
    try {
      await request("/api/cves/batch-status", { method: "POST", body: JSON.stringify({ cveIds: selectedIds, status }) });
      setSelectedIds([]);
      notify(`已批量更新 ${selectedIds.length} 条漏洞`);
      await loadData();
    } catch (requestError) {
      notify(requestError instanceof Error ? requestError.message : "批量更新失败");
    }
  };

  const deleteSelected = async () => {
    if (!selected || !window.confirm(`确认删除 ${selected.cveId}？删除后将保留删除事件。`)) return;
    try {
      await request(`/api/cves/${encodeURIComponent(selected.cveId)}`, { method: "DELETE" });
      setDrawerOpen(false);
      setSelected(null);
      notify("漏洞已删除，删除事件已保留");
      await loadData();
    } catch (requestError) {
      notify(requestError instanceof Error ? requestError.message : "删除失败");
    }
  };

  const login = async (provider: string, email = "admin@argus.local") => {
    try {
      if (provider !== "email") {
        const response = await request<{ data: { url: string } }>(`/api/auth/oauth/${provider}`);
        window.location.assign(response.data.url);
        return;
      }
      const response = await request<{ data: { email: string; role: string; accessToken?: string } }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password: "argus-demo" }) });
      if (response.data.accessToken) window.localStorage.setItem("argus_access_token", response.data.accessToken);
      setIsAdmin(response.data.role === "admin");
      setAdminEmail(response.data.email);
      setLoginOpen(false);
      notify("已进入 Admin 演示模式");
      await loadData();
    } catch (requestError) {
      notify(requestError instanceof Error ? requestError.message : "登录失败");
    }
  };

  const logout = async () => {
    await request("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setIsAdmin(false);
    window.localStorage.removeItem("argus_access_token");
    setAdminEmail("guest@argus.local");
    notify("已退出登录");
  };

  const pageTitle = page === "triage" ? "Triage" : page === "components" ? "Components" : "Overview";
  const pageSubtitle = page === "triage" ? "把依赖证据转化为行动。" : page === "components" ? "维护软件供应链中的组件证据。" : "让风险状态保持可见、可解释、可复现。";

  useEffect(() => {
    if (!globalQuery.trim()) {
      setGlobalResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void request<{ data: GlobalResult[] }>(`/api/search?query=${encodeURIComponent(globalQuery)}`)
        .then((response) => setGlobalResults(response.data))
        .catch(() => setGlobalResults([]));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [globalQuery]);

  const paletteResults = useMemo(() => globalResults.map((result) => ({
    ...result,
    onClick: async () => {
      if (result.type === "CVE") {
        try {
          const response = await request<{ data: CveRecord }>(`/api/cves/${encodeURIComponent(result.target)}`);
          openCve(response.data);
        } catch {
          setPage("triage");
          setLocalQuery(result.target);
        }
      } else {
        setPage("components");
        setLocalQuery(result.target);
        setCommandOpen(false);
      }
    },
  })), [globalResults]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="wordmark"><div><strong>ARGUS</strong><span>软件供应链</span></div><button className="icon-button mobile-menu" aria-label="打开菜单"><Menu size={18} /></button></div>
          <nav className="nav" aria-label="主导航">
            <NavButton active={page === "triage"} icon={<LayoutList size={17} />} label="Triage" onClick={() => setPage("triage")} />
            <NavButton active={page === "components"} icon={<Boxes size={17} />} label="Components" onClick={() => setPage("components")} />
            <NavButton active={page === "overview"} icon={<ChartNoAxesCombined size={17} />} label="Overview" onClick={() => setPage("overview")} />
          </nav>
        </div>
        <div className="sidebar-footer">
          <div className="footer-links">
            <NavButton icon={<Settings size={16} />} label="设置" onClick={() => notify("设置将由部署环境变量提供")} />
            <NavButton icon={<CircleHelp size={16} />} label="帮助" onClick={() => window.open("/api/docs", "_blank")} />
          </div>
          <div className="footer-note">更安全的软件，更稳定的未来。</div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="global-search" role="search">
            <Search size={17} aria-hidden="true" />
            <input aria-label="全局搜索" value={globalQuery} onChange={(event) => { setGlobalQuery(event.target.value); setCommandOpen(true); }} onFocus={() => globalQuery && setCommandOpen(true)} placeholder="搜索 CVE、组件或 PURL…" />
            <span className="shortcut"><Command size={11} /> K</span>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="通知" onClick={() => notify("暂无新的安全通知")}><Bell size={18} /></button>
            {isAdmin ? (
              <button className="profile-chip" onClick={logout} aria-label="退出 Admin">
                <span className="avatar">AD</span><span className="profile-copy"><strong>Admin</strong><span>{adminEmail}</span></span><LogOut size={15} />
              </button>
            ) : (
              <button className="profile-chip" onClick={() => setLoginOpen(true)} aria-label="登录 Admin">
                <span className="avatar"><UserRound size={15} /></span><span className="profile-copy"><strong>Guest</strong><span>仅浏览</span></span><LogIn size={15} />
              </button>
            )}
          </div>
        </header>

        {commandOpen && <CommandPalette query={globalQuery} results={paletteResults} onQueryChange={setGlobalQuery} onClose={() => setCommandOpen(false)} />}
        <div className="content">
          {page === "triage" && (
            <TriagePage
              cves={cves}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              loading={loading}
              error={error}
              pageTitle={pageTitle}
              pageSubtitle={pageSubtitle}
              localQuery={localQuery}
              setLocalQuery={(value) => { setLocalQuery(value); void loadData(value); }}
              severityFilter={severityFilter}
              statusFilter={statusFilter}
              ecosystemFilter={ecosystemFilter}
              onSeverityChange={(value) => { setSeverityFilter(value); void loadData(localQuery, { severity: value }); }}
              onStatusFilterChange={(value) => { setStatusFilter(value); void loadData(localQuery, { status: value }); }}
              onEcosystemChange={(value) => { setEcosystemFilter(value); void loadData(localQuery, { ecosystem: value }); }}
              onClearFilters={() => { setSeverityFilter(""); setStatusFilter(""); setEcosystemFilter(""); void loadData(localQuery, { severity: "", status: "", ecosystem: "" }); }}
              openCve={openCve}
              onBatchStatus={batchStatus}
              isAdmin={isAdmin}
              onLogin={() => setLoginOpen(true)}
            />
          )}
          {page === "components" && (
            <ComponentsPage components={components} query={localQuery} setQuery={setLocalQuery} loading={loading} isAdmin={isAdmin} onLogin={() => setLoginOpen(true)} onRefresh={() => { void loadData(); }} onEdit={(component) => { setEditingComponent(component); setComponentEditorOpen(true); }} onCreate={() => { setEditingComponent(null); setComponentEditorOpen(true); }} onToast={notify} />
          )}
          {page === "overview" && (
            <OverviewPage data={overviewData} loading={loading} isAdmin={isAdmin} onLogin={() => setLoginOpen(true)} onToast={notify} onRefresh={loadData} />
          )}
        </div>
      </main>

      {drawerOpen && selected && <CveDrawer cve={selected} tab={drawerTab} setTab={setDrawerTab} isAdmin={isAdmin} onLogin={() => setLoginOpen(true)} onClose={() => setDrawerOpen(false)} onStatus={changeStatus} onEdit={() => setEditorOpen(true)} onDelete={deleteSelected} onCandidate={async (id, status) => { await request(`/api/cpe-candidates/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }); notify(status === "CONFIRMED" ? "候选关联已确认" : "候选关联已排除"); await loadData(); }} />}
      {editorOpen && selected && <CveEditor cve={selected} onClose={() => setEditorOpen(false)} onSaved={(next) => { updateLocalCve(next); setEditorOpen(false); notify("漏洞内容已保存"); }} />}
      {componentEditorOpen && <ComponentEditor component={editingComponent} onClose={() => setComponentEditorOpen(false)} onSaved={async () => { setComponentEditorOpen(false); await loadData(); notify(editingComponent ? "组件已更新" : "组件已创建"); }} onDeleted={async () => { setComponentEditorOpen(false); await loadData(); notify("组件已删除"); }} onError={notify} />}
      {loginOpen && <LoginDialog onClose={() => setLoginOpen(false)} onLogin={login} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: { active?: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick}>{icon}<span>{label}</span></button>;
}

function TriagePage({ cves, selectedIds, setSelectedIds, loading, error, pageTitle, pageSubtitle, localQuery, setLocalQuery, severityFilter, statusFilter, ecosystemFilter, onSeverityChange, onStatusFilterChange, onEcosystemChange, onClearFilters, openCve, onBatchStatus, isAdmin, onLogin }: { cves: CveRecord[]; selectedIds: string[]; setSelectedIds: (ids: string[]) => void; loading: boolean; error: string | null; pageTitle: string; pageSubtitle: string; localQuery: string; setLocalQuery: (value: string) => void; severityFilter: string; statusFilter: string; ecosystemFilter: string; onSeverityChange: (value: string) => void; onStatusFilterChange: (value: string) => void; onEcosystemChange: (value: string) => void; onClearFilters: () => void; openCve: (cve: CveRecord) => void; onBatchStatus: (status: TriageStatus) => void; isAdmin: boolean; onLogin: () => void }) {
  const allSelected = cves.length > 0 && cves.every((item) => selectedIds.includes(item.cveId));
  return <>
    <div className="page-heading"><div><div className="eyebrow">漏洞管理</div><h1 className="serif">{pageTitle}</h1><p>{pageSubtitle}</p></div><div className="heading-note">更小的风险，创造更具韧性的未来。</div></div>
    <div className="filter-row"><div className="local-search"><Search size={17} /><input value={localQuery} onChange={(event) => setLocalQuery(event.target.value)} placeholder="筛选 CVE ID、组件或关键字…" aria-label="筛选当前漏洞列表" /></div><label className="select-wrap"><span className="sr-only">严重度</span><select className="select-button" value={severityFilter} onChange={(event) => onSeverityChange(event.target.value)}><option value="">严重度</option><option value="CRITICAL">严重</option><option value="HIGH">高</option><option value="MEDIUM">中</option><option value="LOW">低</option></select></label><label className="select-wrap"><span className="sr-only">生态系</span><select className="select-button" value={ecosystemFilter} onChange={(event) => onEcosystemChange(event.target.value)}><option value="">生态系</option><option value="maven">Maven</option><option value="npm">npm</option><option value="pypi">PyPI</option><option value="golang">Go</option></select></label><label className="select-wrap"><span className="sr-only">状态</span><select className="select-button" value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)}><option value="">状态</option><option value="PENDING">待处理</option><option value="CONFIRMED">已确认</option><option value="DEFERRED">已延后</option><option value="FALSE_POSITIVE">误报</option></select></label><button className="select-button" onClick={onClearFilters}><SlidersHorizontal size={15} /> 清除筛选</button></div>
    {!isAdmin && <div className="batch-bar"><Lock size={15} /><span>当前为访客浏览模式，登录后可修改、批量处理与删除。</span><button className="primary-button small-button" onClick={onLogin}>登录 Admin</button></div>}
    {selectedIds.length > 0 && isAdmin && <div className="batch-bar"><Check size={15} /><span>已选择 {selectedIds.length} 条漏洞</span><button className="secondary-button small-button" onClick={() => onBatchStatus("CONFIRMED")}>批量确认</button><button className="secondary-button small-button" onClick={() => onBatchStatus("DEFERRED")}>批量延后</button><button className="secondary-button small-button" onClick={() => onBatchStatus("FALSE_POSITIVE")}>标记误报</button></div>}
    <div className="table-shell" aria-live="polite"><div className="table-head"><span><input type="checkbox" checked={allSelected} onChange={() => setSelectedIds(allSelected ? [] : cves.map((item) => item.cveId))} aria-label="全选" /></span><span>严重度</span><span>CVE ID</span><span>标题</span><span>CVSS v3.1</span><span>最后更新</span><span>状态</span><span /></div>
      {loading && <div className="empty-state">正在加载漏洞数据…</div>}
      {!loading && error && <div className="empty-state"><AlertTriangle size={18} /> {error}</div>}
      {!loading && !error && !cves.length && <div className="empty-state"><FileSearch size={18} /> 没有匹配的漏洞</div>}
      {!loading && !error && cves.map((cve) => <button className={`table-row ${selectedIds.includes(cve.cveId) ? "selected" : ""}`} key={cve.cveId} onClick={() => openCve(cve)}>
        <span onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={selectedIds.includes(cve.cveId)} onChange={(event) => setSelectedIds(event.target.checked ? [...selectedIds, cve.cveId] : selectedIds.filter((id) => id !== cve.cveId))} aria-label={`选择 ${cve.cveId}`} /></span>
        <span className="severity-cell"><i className={`severity-dot ${cve.severity}`} />{severityLabels[cve.severity ?? ""] ?? cve.severity}</span>
        <span className="cell-muted">{cve.cveId}</span>
        <span className="cell-title"><strong>{cve.title}</strong><span>{cve.candidates[0]?.componentName ?? "未匹配组件"}</span></span>
        <span className="cvss">{cve.cvssScoreV3 ?? cve.cvssScoreV4 ?? "—"}</span>
        <span className="cell-muted">{formatDate(cve.sourceUpdateDate)}</span>
        <span className={`status-label ${statusClass(cve.triageStatus)}`}>{statusLabels[cve.triageStatus]}</span>
        <span><MoreHorizontal size={17} /></span>
      </button>)}
    </div>
    <div className="table-footer"><span>{selectedIds.length ? `已选择 ${selectedIds.length} 条，共 ${cves.length} 条` : `共 ${cves.length} 条漏洞`}</span><span className="pagination"><span>每页显示</span><button className="select-button small-button">10 <ChevronDown size={13} /></button><button className="page-button"><ChevronLeft size={15} /></button><button className="page-button active">1</button><button className="page-button">2</button><button className="page-button">3</button><button className="page-button"><ChevronRight size={15} /></button></span></div>
  </>;
}

function CveDrawer({ cve, tab, setTab, isAdmin, onLogin, onClose, onStatus, onEdit, onDelete, onCandidate }: { cve: CveRecord; tab: DrawerTab; setTab: (tab: DrawerTab) => void; isAdmin: boolean; onLogin: () => void; onClose: () => void; onStatus: (cveId: string, status: TriageStatus) => void; onEdit: () => void; onDelete: () => void; onCandidate: (id: string, status: "CONFIRMED" | "REJECTED") => void }) {
  return <><div className="drawer-backdrop" onClick={onClose} /><aside className="drawer" role="dialog" aria-modal="true" aria-label={`${cve.cveId} 详情`} onClick={(event) => event.stopPropagation()}><div className="drawer-header"><div className="drawer-header-top"><div><div className="drawer-cve">{cve.cveId}</div><span className="pill"><i className={`severity-dot ${cve.severity}`} />{severityLabels[cve.severity ?? ""] ?? cve.severity}</span><h2>{cve.title}</h2></div><button className="drawer-close" onClick={onClose} aria-label="关闭详情"><X size={20} /></button></div></div><div className="tabs">{(["Overview", "Impact", "History"] as DrawerTab[]).map((item) => <button key={item} className={`tab ${tab === item ? "active" : ""}`} onClick={() => setTab(item)}>{item}</button>)}</div><div className="drawer-body">
    {tab === "Overview" && <><div className="section-label">摘要</div><p className="summary">{cve.description}</p><div className="section-label">本地处理状态</div><div className="status-control">{(Object.keys(statusLabels) as TriageStatus[]).map((status) => <button key={status} className={`status-choice ${cve.triageStatus === status ? "active" : ""}`} onClick={() => isAdmin ? onStatus(cve.cveId, status) : onLogin}>{statusLabels[status]}</button>)}</div><div className="score"><div className="score-top"><div><div className="section-label">评分详情</div><div className="score-number">{cve.cvssScoreV3 ?? cve.cvssScoreV4 ?? "—"}</div></div><span className="cell-muted">CVSS v3.1</span></div><div className="score-track"><span style={{ width: `${Math.min((cve.cvssScoreV3 ?? 0) * 10, 100)}%` }} /></div></div><DetailField label="受影响版本" value={cve.affectedVersions.join(", ") || "未提供"} /><DetailField label="来源" value={cve.sourceName ?? "NVD"} locked /></>}
    {tab === "Impact" && <><div className="section-label">受影响组件</div><div className="related-list">{cve.candidates.map((candidate) => <div className="related-item" key={candidate.id}><div className="related-top"><span className="related-name">{candidate.componentName}<br /><span className="cell-muted">{candidate.componentPurl}</span></span><span className={`candidate-tag ${candidate.status}`}>{candidate.status === "CANDIDATE" ? "候选" : candidate.status === "CONFIRMED" ? "已确认" : "已排除"}</span></div><span className="confidence">{candidate.matchReason} · 置信度 {Math.round((candidate.confidence ?? 0) * 100)}%</span>{candidate.status === "CANDIDATE" && <div className="candidate-actions">{isAdmin ? <><button className="secondary-button small-button" onClick={() => onCandidate(candidate.id, "CONFIRMED")}><Check size={13} /> 确认</button><button className="secondary-button small-button" onClick={() => onCandidate(candidate.id, "REJECTED")}>排除</button></> : <span className="cell-muted">登录后确认候选关系</span>}</div>}</div>)}</div>{!cve.candidates.length && <div className="empty-state">暂无候选关联</div>}</>}
    {tab === "History" && <div className="audit-list">{cve.history.length ? cve.history.map((event) => <div className="audit-item" key={event.id}><div><strong>{event.action === "STATUS_CHANGED" ? `状态改为「${statusLabels[String(event.metadata?.status) as TriageStatus] ?? String(event.metadata?.status ?? "未知")}」` : event.action === "CVE_UPDATED" ? "更新了漏洞内容" : event.action}</strong><span>{event.actorEmail ?? "Admin"}</span></div><span><Clock3 size={13} /> {formatDate(event.createdAt)}</span></div>) : <div className="empty-state">暂无状态历史</div>}</div>}
    <div className="drawer-actions">{isAdmin ? <><button className="primary-button" onClick={onEdit}><Pencil size={15} /> 编辑记录</button><button className="danger-button" onClick={onDelete} aria-label="删除漏洞"><Trash2 size={15} /></button></> : <button className="primary-button" onClick={onLogin}><LogIn size={15} /> 登录后编辑</button>}<a className="secondary-button" href={cve.sourceLink ?? "#"} target="_blank" rel="noreferrer"><ArrowUpRight size={15} /> 来源</a></div>
  </div></aside></>;
}

function DetailField({ label, value, locked }: { label: string; value: string; locked?: boolean }) { return <div className="field" style={{ marginBottom: 14 }}><label>{label} {locked && <Lock size={12} />}</label><div className="secondary-button" style={{ justifyContent: "space-between", cursor: "default" }}>{value}{locked && <Lock size={13} />}</div></div>; }

function CveEditor({ cve, onClose, onSaved }: { cve: CveRecord; onClose: () => void; onSaved: (cve: CveRecord) => void }) {
  const [form, setForm] = useState({ title: cve.title ?? "", description: cve.description ?? "", severity: cve.severity ?? "MEDIUM", cvssScoreV3: String(cve.cvssScoreV3 ?? ""), affectedVersions: cve.affectedVersions.join(", "), cweIds: cve.cweIds.join(", ") });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      const response = await request<{ data: CveRecord }>(`/api/cves/${encodeURIComponent(cve.cveId)}`, { method: "PATCH", body: JSON.stringify({ ...form, cvssScoreV3: form.cvssScoreV3 ? Number(form.cvssScoreV3) : null, affectedVersions: form.affectedVersions.split(",").map((item) => item.trim()).filter(Boolean), cweIds: form.cweIds.split(",").map((item) => item.trim()).filter(Boolean) }) });
      onSaved(response.data);
    } catch (error) { window.alert(error instanceof Error ? error.message : "保存失败"); } finally { setSaving(false); }
  };
  return <div className="editor-overlay"><section className="editor" role="dialog" aria-modal="true" aria-label="编辑漏洞记录"><div className="editor-header"><div><div className="eyebrow">Triage / {cve.cveId}</div><h2>编辑记录</h2><span className="pill"><Activity size={13} /> 未保存的本地修改</span></div><button className="drawer-close" onClick={onClose} aria-label="关闭编辑"><X size={20} /></button></div><div className="editor-form"><div className="field"><label htmlFor="cve-title">标题</label><input id="cve-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></div><div className="field"><label htmlFor="cve-severity">严重度</label><select id="cve-severity" value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value })}>{Object.entries(severityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="field"><label htmlFor="cve-score">CVSS v3</label><input id="cve-score" type="number" min="0" max="10" step="0.1" value={form.cvssScoreV3} onChange={(event) => setForm({ ...form, cvssScoreV3: event.target.value })} /></div><div className="field"><label>来源识别 <Lock size={12} /></label><input value={`${cve.sourceName ?? "NVD"} · ${cve.sourceId}`} disabled /></div><div className="field full"><label htmlFor="cve-description">描述</label><textarea id="cve-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div><div className="field"><label htmlFor="cve-versions">受影响版本</label><input id="cve-versions" value={form.affectedVersions} onChange={(event) => setForm({ ...form, affectedVersions: event.target.value })} /></div><div className="field"><label htmlFor="cve-cwe">CWE</label><input id="cve-cwe" value={form.cweIds} onChange={(event) => setForm({ ...form, cweIds: event.target.value })} /></div><div className="field"><label>来源链接 <Lock size={12} /></label><input value={cve.sourceLink ?? "—"} disabled /></div><div className="editor-footer"><button className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" onClick={save} disabled={saving}>{saving ? "保存中…" : "保存修改"}</button></div></div></section></div>;
}

function ComponentsPage({ components, query, setQuery, loading, isAdmin, onLogin, onRefresh, onEdit, onCreate, onToast }: { components: ComponentRecord[]; query: string; setQuery: (value: string) => void; loading: boolean; isAdmin: boolean; onLogin: () => void; onRefresh: () => void; onEdit: (component: ComponentRecord) => void; onCreate: () => void; onToast: (message: string) => void }) {
  const visibleComponents = components.filter((component) => `${component.purl} ${component.name} ${component.vendor ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <><div className="page-heading"><div><div className="eyebrow">供应链证据</div><h1 className="serif">Components</h1><p>维护可追踪、可复核的组件元数据。</p></div><button className="primary-button" onClick={isAdmin ? onCreate : onLogin}><Plus size={16} /> 新增组件</button></div><div className="filter-row"><div className="local-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索 PURL、名称或供应商…" aria-label="筛选组件列表" /></div><button className="select-button" onClick={onRefresh}><RotateCw size={15} /> 刷新</button><button className="select-button"><Filter size={15} /> 类型</button></div><div className="table-shell"><div className="table-head" style={{ gridTemplateColumns: "minmax(220px,1.2fr) 120px minmax(150px,1fr) 140px 120px 80px" }}><span>PURL</span><span>类型</span><span>名称</span><span>版本</span><span>记录时间</span><span /></div>{loading && <div className="empty-state">正在加载组件…</div>}{!loading && !visibleComponents.length && <div className="empty-state">暂无组件记录</div>}{visibleComponents.map((component) => <button className="table-row" style={{ gridTemplateColumns: "minmax(220px,1.2fr) 120px minmax(150px,1fr) 140px 120px 80px" }} key={component.purl} onClick={() => isAdmin ? onEdit(component) : onLogin()}><span className="cell-title"><strong>{component.purl}</strong><span>{component.cpe ?? "未提供 CPE"}</span></span><span>{component.type ?? "—"}</span><span>{component.vendor ? `${component.vendor} / ` : ""}{component.name}</span><span>{component.version}</span><span className="cell-muted">{formatDate(component.recordTime)}</span><span><MoreHorizontal size={17} /></span></button>)}</div><div className="table-footer"><span>共 {visibleComponents.length} 个组件</span><span className="cell-muted">PURL 创建后锁定</span></div></>;
}

function ComponentEditor({ component, onClose, onSaved, onDeleted, onError }: { component: ComponentRecord | null; onClose: () => void; onSaved: () => Promise<void>; onDeleted: () => Promise<void>; onError: (message: string) => void }) {
  const [form, setForm] = useState({ purl: component?.purl ?? "pkg:maven/example/library@1.0.0", name: component?.name ?? "", version: component?.version ?? "", vendor: component?.vendor ?? "", type: component?.type ?? "maven", cpe: component?.cpe ?? "", license: component?.license ?? "", repository: component?.repository ?? "", description: component?.description ?? "" });
  const save = async () => { if (!form.purl.trim() || !form.name.trim() || !form.version.trim()) return onError("PURL、名称和版本不能为空"); try { await request(`/api/components${component ? `/${encodeURIComponent(component.purl)}` : ""}`, { method: component ? "PATCH" : "POST", body: JSON.stringify(form) }); await onSaved(); } catch (error) { onError(error instanceof Error ? error.message : "组件保存失败"); } };
  const remove = async () => { if (!component || !window.confirm(`确认删除组件 ${component.name}？关联候选关系也会被删除。`)) return; try { await request(`/api/components/${encodeURIComponent(component.purl)}`, { method: "DELETE" }); await onDeleted(); } catch (error) { onError(error instanceof Error ? error.message : "组件删除失败"); } };
  return <div className="editor-overlay"><section className="editor" role="dialog" aria-modal="true" aria-label="组件表单"><div className="editor-header"><div><div className="eyebrow">Components</div><h2>{component ? "编辑组件" : "新增组件"}</h2><p>保留来源证据，同时维护本地元数据。</p></div><button className="drawer-close" onClick={onClose} aria-label="关闭组件表单"><X size={20} /></button></div><div className="editor-form"><div className="field full"><label htmlFor="component-purl">PURL {component && <Lock size={12} />}</label><input id="component-purl" value={form.purl} disabled={Boolean(component)} onChange={(event) => setForm({ ...form, purl: event.target.value })} /></div><div className="field"><label htmlFor="component-name">名称</label><input id="component-name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div><div className="field"><label htmlFor="component-version">版本</label><input id="component-version" required value={form.version} onChange={(event) => setForm({ ...form, version: event.target.value })} /></div><div className="field"><label htmlFor="component-vendor">供应商</label><input id="component-vendor" value={form.vendor} onChange={(event) => setForm({ ...form, vendor: event.target.value })} /></div><div className="field"><label htmlFor="component-type">类型</label><input id="component-type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} /></div><div className="field"><label htmlFor="component-cpe">CPE</label><input id="component-cpe" value={form.cpe} onChange={(event) => setForm({ ...form, cpe: event.target.value })} /></div><div className="field"><label htmlFor="component-license">许可证</label><input id="component-license" value={form.license} onChange={(event) => setForm({ ...form, license: event.target.value })} /></div><div className="field full"><label htmlFor="component-repository">仓库链接</label><input id="component-repository" value={form.repository} onChange={(event) => setForm({ ...form, repository: event.target.value })} /></div><div className="field full"><label htmlFor="component-description">描述</label><textarea id="component-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div><div className="editor-footer">{component && <button className="danger-button" onClick={remove}><Trash2 size={15} /> 删除组件</button>}<button className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" onClick={save}>{component ? "保存修改" : "创建组件"}</button></div></div></section></div>;
}

function OverviewPage({ data, loading, isAdmin, onLogin, onToast, onRefresh }: { data: OverviewData | null; loading: boolean; isAdmin: boolean; onLogin: () => void; onToast: (message: string) => void; onRefresh: () => Promise<void> }) {
  const [job, setJob] = useState<ImportJob | null>(data?.latestImport ?? null);
  const [working, setWorking] = useState(false);
  useEffect(() => { setJob(data?.latestImport ?? null); }, [data?.latestImport]);
  const startImport = async () => {
    if (!isAdmin) return onLogin();
    setWorking(true);
    try {
      const response = await request<{ data: ImportJob }>("/api/imports", { method: "POST" });
      setJob(response.data);
      onToast("数据刷新已进入队列");
      const timer = window.setInterval(async () => {
        const next = await request<{ data: ImportJob }>(`/api/imports/${response.data.id}`);
        setJob(next.data);
        if (["PREVIEW_READY", "FAILED", "SUCCEEDED"].includes(next.data.status)) { window.clearInterval(timer); setWorking(false); await onRefresh(); }
      }, 1000);
    } catch (error) { setWorking(false); onToast(error instanceof Error ? error.message : "启动导入失败"); }
  };
  const merge = async () => { if (!job || !isAdmin) return onLogin(); try { const response = await request<{ data: ImportJob }>(`/api/imports/${job.id}/merge`, { method: "POST" }); setJob(response.data); onToast("预览已合并到正式数据"); await onRefresh(); } catch (error) { onToast(error instanceof Error ? error.message : "合并失败"); } };
  const retry = async () => { if (!job || !isAdmin) return onLogin(); try { const response = await request<{ data: ImportJob }>(`/api/imports/${job.id}/retry`, { method: "POST" }); setJob(response.data); onToast("已重新排队"); } catch (error) { onToast(error instanceof Error ? error.message : "重试失败"); } };
  const severityMax = Math.max(...(data?.severity.map((item) => item.count) ?? [1]), 1);
  const ecosystemMax = Math.max(...(data?.ecosystems.map((item) => item.count) ?? [1]), 1);
  return <><div className="page-heading"><div><div className="eyebrow">安全态势</div><h1 className="serif">Overview</h1><p>让风险状态保持可见、可解释、可复现。</p></div><button className="primary-button" onClick={startImport} disabled={working}>{working ? <RotateCw size={15} className="spin" /> : <RotateCw size={15} />} {working ? "刷新中…" : "刷新内建数据"}</button></div>{loading && !data ? <div className="empty-state">正在计算风险状态…</div> : <><div className="dashboard-grid"><Metric label="未处理 Critical" value={data?.openCritical ?? 0} note="需要优先确认" /><Metric label="未处理 High" value={data?.openHigh ?? 0} note="等待分流" /><Metric label="Risk Index" value={`${data?.riskIndex ?? 0}`} note="Argus 工作台指标" /><Metric label="候选关系" value={data?.ecosystems.reduce((sum, item) => sum + item.count, 0) ?? 0} note="需要人工确认" /></div><div className="overview-grid"><section className="panel"><h3>严重度分布</h3><div className="bars">{data?.severity.map((item) => <div className="bar-row" key={item.name}><span>{severityLabels[item.name] ?? item.name}</span><div className="bar-track"><div className={`bar-fill ${item.name.toLowerCase()}`} style={{ width: `${(item.count / severityMax) * 100}%` }} /></div><strong>{item.count}</strong></div>)}</div></section><section className="panel"><h3>生态系统</h3><div className="bars">{data?.ecosystems.length ? data.ecosystems.map((item) => <div className="bar-row" key={item.name}><span>{item.name}</span><div className="bar-track"><div className="bar-fill ecosystem" style={{ width: `${(item.count / ecosystemMax) * 100}%` }} /></div><strong>{item.count}</strong></div>) : <div className="empty-state">暂无生态系统数据</div>}</div></section><section className="import-panel"><div className="import-top"><div><div className="section-label">导入流程</div><h3>内建数据刷新</h3><div className="import-status"><Activity size={14} /> 状态：<strong>{job ? importStatusLabel(job.status) : "尚未运行"}</strong>{job?.retryCount ? ` · 已重试 ${job.retryCount} 次` : ""}</div></div><button className="secondary-button" onClick={startImport} disabled={working}><RotateCw size={14} /> 重新预览</button></div>{job?.summary && <div className="diff-list"><div className="diff-item"><strong>{job.summary.cves} 条 CVE</strong>来源记录已解析</div><div className="diff-item"><strong>{job.summary.components} 个 Component</strong>可进入合并预览</div>{job.sampleDiffs?.map((diff) => <div className="diff-item" key={`${diff.entity}-${diff.key}`}><strong>{diff.entity} · {diff.key}</strong>{diff.change}</div>)}</div>}{job?.status === "PREVIEW_READY" && isAdmin && <div style={{ display: "flex", gap: 8, marginTop: 14 }}><button className="primary-button" onClick={merge}><Check size={15} /> 合并更新</button><button className="secondary-button" onClick={() => onToast("差异样本已在上方展示")}>查看差异</button></div>}{job?.status === "FAILED" && <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}><span className="cell-muted">{job.errorMessage ?? "导入失败"}</span><button className="secondary-button small-button" onClick={retry}>重试</button></div>}</section></div></>}</>;
}

function Metric({ label, value, note }: { label: string; value: string | number; note: string }) { return <div className="metric"><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-note">{note}</div></div>; }
function importStatusLabel(status: ImportJob["status"]) { return { QUEUED: "排队中", RUNNING: "解析中", PREVIEW_READY: "等待合并", MERGING: "合并中", SUCCEEDED: "已完成", FAILED: "失败" }[status]; }

function CommandPalette({ query, results, onQueryChange, onClose }: { query: string; results: Array<{ type: string; label: string; sublabel: string; onClick: () => void }>; onQueryChange: (query: string) => void; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  return <><div className="drawer-backdrop" onClick={onClose} /><div className="command-palette" role="dialog" aria-label="全局搜索"><input ref={inputRef} className="command-input" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="搜索 CVE、组件或 PURL…" /><div className="command-results">{query && results.length ? results.map((result) => <button key={`${result.type}-${result.label}`} className="command-item" onClick={result.onClick}><div><strong>{result.label}</strong><span>{result.sublabel}</span></div><span>{result.type}</span></button>) : <div className="empty-state"><Search size={17} /> 输入关键词，搜索全局 CVE 与组件</div>}</div></div></>;
}

function LoginDialog({ onClose, onLogin }: { onClose: () => void; onLogin: (provider: string, email?: string) => void }) {
  const [email, setEmail] = useState("admin@argus.local");
  const [password, setPassword] = useState("argus-demo");
  const [providers, setProviders] = useState({ email: true, google: false, github: false });
  useEffect(() => { void request<{ data: typeof providers }>("/api/auth/providers").then((response) => setProviders(response.data)).catch(() => undefined); }, []);
  return <div className="login-overlay"><section className="login-card" role="dialog" aria-modal="true" aria-label="登录 Argus"><div className="eyebrow">Argus 登录</div><h2>登录</h2><p>登录后可以修改漏洞、维护组件并运行数据刷新。</p>{providers.email && <form onSubmit={(event) => { event.preventDefault(); onLogin("email", email); }}><div className="field"><label htmlFor="login-email">邮箱</label><input id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div><div className="field"><label htmlFor="login-password">密码</label><input id="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div><button className="primary-button" type="submit">使用邮箱登录</button></form>}<div className="divider">或使用已配置的登录方式</div><div className="social-row">{providers.google && <button className="secondary-button" onClick={() => onLogin("google", email)}>Google</button>}{providers.github && <button className="secondary-button" onClick={() => onLogin("github", email)}>GitHub</button>}{!providers.google && !providers.github && <span className="cell-muted">Google／GitHub 尚未配置</span>}</div><button className="icon-button" style={{ margin: "17px auto 0" }} onClick={onClose} aria-label="关闭登录"><X size={18} /></button></section></div>;
}

function EmptyState() { return <div className="empty-state" />; }

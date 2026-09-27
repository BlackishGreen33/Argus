"use client";

import {
  Bell,
  Boxes,
  ChartNoAxesCombined,
  CircleHelp,
  Command,
  LayoutList,
  LogIn,
  LogOut,
  Menu,
  Search,
  Settings,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { CommandPalette } from "@/components/CommandPalette";
import { ComponentEditor } from "@/components/components/ComponentEditor";
import { ComponentsPage } from "@/components/components/ComponentsPage";
import { NavButton } from "@/components/layout/Navigation";
import { LoginDialog } from "@/components/LoginDialog";
import { OverviewPage } from "@/components/overview/OverviewPage";
import { CveDrawer } from "@/components/triage/CveDrawer";
import { CveEditor } from "@/components/triage/CveEditor";
import { TriagePage } from "@/components/triage/TriagePage";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useToast } from "@/hooks/useToast";
import type { ComponentRecord, CveRecord, OverviewData, TriageStatus } from "@/types/domain";
import type { DrawerTab, GlobalResult, Page } from "@/types/ui";
import { request } from "@/utils/http";
import { statusLabels } from "@/utils/labels";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast, notify } = useToast();

  const loadData = async (
    query = localQuery,
    filterOverrides?: Partial<{ severity: string; status: string; ecosystem: string }>,
  ) => {
    const filters = { severity: severityFilter, status: statusFilter, ecosystem: ecosystemFilter, ...filterOverrides };
    setLoading(true);
    setError(null);
    try {
      const [cveResponse, componentResponse, overviewResponse, userResponse] = await Promise.all([
        request<{ data: CveRecord[] }>(
          `/api/cves?query=${encodeURIComponent(query)}&pageSize=50${filters.severity ? `&severity=${filters.severity}` : ""}${filters.status ? `&status=${filters.status}` : ""}${filters.ecosystem ? `&ecosystem=${filters.ecosystem}` : ""}`,
        ),
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
  useEffect(() => {
    void loadData("");
    // The initial request intentionally runs once; later searches call loadData(value).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useKeyboardShortcuts(
    () => setCommandOpen(true),
    () => {
      setCommandOpen(false);
      setDrawerOpen(false);
      setEditorOpen(false);
      setLoginOpen(false);
    },
  );

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
      const response = await request<{ data: CveRecord }>(`/api/cves/${encodeURIComponent(cveId)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      updateLocalCve(response.data);
      notify(`状态已更新为「${statusLabels[status]}」`);
    } catch (requestError) {
      notify(requestError instanceof Error ? requestError.message : "状态更新失败");
    }
  };

  const batchStatus = async (status: TriageStatus) => {
    if (!selectedIds.length) return;
    try {
      await request("/api/cves/batch-status", {
        method: "POST",
        body: JSON.stringify({ cveIds: selectedIds, status }),
      });
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
      const response = await request<{ data: { email: string; role: string; accessToken?: string } }>(
        "/api/auth/login",
        { method: "POST", body: JSON.stringify({ email, password: "argus-demo" }) },
      );
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
  const pageSubtitle =
    page === "triage"
      ? "把依赖证据转化为行动。"
      : page === "components"
        ? "维护软件供应链中的组件证据。"
        : "让风险状态保持可见、可解释、可复现。";

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

  const paletteResults = useMemo(
    () =>
      globalResults.map((result) => ({
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
      })),
    [globalResults],
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="wordmark">
            <div>
              <strong>ARGUS</strong>
              <span>软件供应链</span>
            </div>
            <button className="icon-button mobile-menu" aria-label="打开菜单">
              <Menu size={18} />
            </button>
          </div>
          <nav className="nav" aria-label="主导航">
            <NavButton
              active={page === "triage"}
              icon={<LayoutList size={17} />}
              label="Triage"
              onClick={() => setPage("triage")}
            />
            <NavButton
              active={page === "components"}
              icon={<Boxes size={17} />}
              label="Components"
              onClick={() => setPage("components")}
            />
            <NavButton
              active={page === "overview"}
              icon={<ChartNoAxesCombined size={17} />}
              label="Overview"
              onClick={() => setPage("overview")}
            />
          </nav>
        </div>
        <div className="sidebar-footer">
          <div className="footer-links">
            <NavButton icon={<Settings size={16} />} label="设置" onClick={() => notify("设置将由部署环境变量提供")} />
            <NavButton
              icon={<CircleHelp size={16} />}
              label="帮助"
              onClick={() => window.open("/api/docs", "_blank")}
            />
          </div>
          <div className="footer-note">更安全的软件，更稳定的未来。</div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="global-search" role="search">
            <Search size={17} aria-hidden="true" />
            <input
              aria-label="全局搜索"
              value={globalQuery}
              onChange={(event) => {
                setGlobalQuery(event.target.value);
                setCommandOpen(true);
              }}
              onFocus={() => globalQuery && setCommandOpen(true)}
              placeholder="搜索 CVE、组件或 PURL…"
            />
            <span className="shortcut">
              <Command size={11} /> K
            </span>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="通知" onClick={() => notify("暂无新的安全通知")}>
              <Bell size={18} />
            </button>
            {isAdmin ? (
              <button className="profile-chip" onClick={logout} aria-label="退出 Admin">
                <span className="avatar">AD</span>
                <span className="profile-copy">
                  <strong>Admin</strong>
                  <span>{adminEmail}</span>
                </span>
                <LogOut size={15} />
              </button>
            ) : (
              <button className="profile-chip" onClick={() => setLoginOpen(true)} aria-label="登录 Admin">
                <span className="avatar">
                  <UserRound size={15} />
                </span>
                <span className="profile-copy">
                  <strong>Guest</strong>
                  <span>仅浏览</span>
                </span>
                <LogIn size={15} />
              </button>
            )}
          </div>
        </header>

        {commandOpen && (
          <CommandPalette
            query={globalQuery}
            results={paletteResults}
            onQueryChange={setGlobalQuery}
            onClose={() => setCommandOpen(false)}
          />
        )}
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
              setLocalQuery={(value) => {
                setLocalQuery(value);
                void loadData(value);
              }}
              severityFilter={severityFilter}
              statusFilter={statusFilter}
              ecosystemFilter={ecosystemFilter}
              onSeverityChange={(value) => {
                setSeverityFilter(value);
                void loadData(localQuery, { severity: value });
              }}
              onStatusFilterChange={(value) => {
                setStatusFilter(value);
                void loadData(localQuery, { status: value });
              }}
              onEcosystemChange={(value) => {
                setEcosystemFilter(value);
                void loadData(localQuery, { ecosystem: value });
              }}
              onClearFilters={() => {
                setSeverityFilter("");
                setStatusFilter("");
                setEcosystemFilter("");
                void loadData(localQuery, { severity: "", status: "", ecosystem: "" });
              }}
              openCve={openCve}
              onBatchStatus={batchStatus}
              isAdmin={isAdmin}
              onLogin={() => setLoginOpen(true)}
            />
          )}
          {page === "components" && (
            <ComponentsPage
              components={components}
              query={localQuery}
              setQuery={setLocalQuery}
              loading={loading}
              isAdmin={isAdmin}
              onLogin={() => setLoginOpen(true)}
              onRefresh={() => {
                void loadData();
              }}
              onEdit={(component) => {
                setEditingComponent(component);
                setComponentEditorOpen(true);
              }}
              onCreate={() => {
                setEditingComponent(null);
                setComponentEditorOpen(true);
              }}
            />
          )}
          {page === "overview" && (
            <OverviewPage
              data={overviewData}
              loading={loading}
              isAdmin={isAdmin}
              onLogin={() => setLoginOpen(true)}
              onToast={notify}
              onRefresh={loadData}
            />
          )}
        </div>
      </main>

      {drawerOpen && selected && (
        <CveDrawer
          cve={selected}
          tab={drawerTab}
          setTab={setDrawerTab}
          isAdmin={isAdmin}
          onLogin={() => setLoginOpen(true)}
          onClose={() => setDrawerOpen(false)}
          onStatus={changeStatus}
          onEdit={() => setEditorOpen(true)}
          onDelete={deleteSelected}
          onCandidate={async (id, status) => {
            await request(`/api/cpe-candidates/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
            notify(status === "CONFIRMED" ? "候选关联已确认" : "候选关联已排除");
            await loadData();
          }}
        />
      )}
      {editorOpen && selected && (
        <CveEditor
          cve={selected}
          onClose={() => setEditorOpen(false)}
          onSaved={(next) => {
            updateLocalCve(next);
            setEditorOpen(false);
            notify("漏洞内容已保存");
          }}
        />
      )}
      {componentEditorOpen && (
        <ComponentEditor
          component={editingComponent}
          onClose={() => setComponentEditorOpen(false)}
          onSaved={async () => {
            setComponentEditorOpen(false);
            await loadData();
            notify(editingComponent ? "组件已更新" : "组件已创建");
          }}
          onDeleted={async () => {
            setComponentEditorOpen(false);
            await loadData();
            notify("组件已删除");
          }}
          onError={notify}
        />
      )}
      {loginOpen && <LoginDialog onClose={() => setLoginOpen(false)} onLogin={login} />}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

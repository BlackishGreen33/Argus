"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  Boxes,
  ChartNoAxesCombined,
  CircleHelp,
  Command,
  GitBranch,
  LayoutList,
  LogIn,
  LogOut,
  Menu,
  PanelLeft,
  Search,
  Settings,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { CommandPalette } from "@/components/CommandPalette";
import { ComponentEditor } from "@/components/components/ComponentEditor";
import { ComponentsPage } from "@/components/components/ComponentsPage";
import { HelpPanel } from "@/components/layout/HelpPanel";
import { NavButton } from "@/components/layout/Navigation";
import { NotificationPanel } from "@/components/layout/NotificationPanel";
import { SettingsPanel, type ThemeAccent } from "@/components/layout/SettingsPanel";
import { LoginDialog } from "@/components/LoginDialog";
import { OverviewPage } from "@/components/overview/OverviewPage";
import { PageTransition } from "@/components/PageTransition";
import { CveDrawer } from "@/components/triage/CveDrawer";
import { CveEditor } from "@/components/triage/CveEditor";
import { TriagePage } from "@/components/triage/TriagePage";
import { NotificationBell } from "@/components/ui/notification-bell";
import { argusQueryKeys, useArgusQueries } from "@/hooks/useArgusQueries";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useToast } from "@/hooks/useToast";
import type { ComponentRecord, CveRecord, TriageStatus } from "@/types/domain";
import type { DrawerTab, GlobalResult, Page } from "@/types/ui";
import { request } from "@/utils/http";
import { statusLabels } from "@/utils/labels";

export function ArgusApp() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState<Page>("triage");
  const [cvePage, setCvePage] = useState(1);
  const [cvePageSize, setCvePageSize] = useState(10);
  const [selected, setSelected] = useState<CveRecord | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("Overview");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [triageQuery, setTriageQuery] = useState("");
  const [componentQuery, setComponentQuery] = useState("");
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [themeAccent, setThemeAccent] = useState<ThemeAccent>("terracotta");
  const [editingComponent, setEditingComponent] = useState<ComponentRecord | null>(null);
  const { notify } = useToast();
  const queries = useArgusQueries({
    query: triageQuery,
    page: cvePage,
    pageSize: cvePageSize,
    severity: severityFilter,
    status: statusFilter,
    ecosystem: ecosystemFilter,
  });
  const cves = useMemo(() => queries.cves.data?.data ?? [], [queries.cves.data]);
  const components = queries.components.data?.data ?? [];
  const overviewData = queries.overview.data?.data ?? null;
  const cveTotal = queries.cves.data?.meta?.total ?? cves.length;
  const loading =
    queries.cves.isFetching || queries.components.isFetching || queries.overview.isFetching || queries.user.isFetching;
  const error =
    [queries.cves.error, queries.components.error, queries.overview.error, queries.user.error].find(Boolean)?.message ??
    null;
  const loadData = async () => {
    await queryClient.invalidateQueries({ queryKey: argusQueryKeys.all });
  };

  useEffect(() => {
    if (!queries.user.data) return;
    setIsAdmin(queries.user.data.data.role === "admin");
    setAdminEmail(queries.user.data.data.email);
  }, [queries.user.data]);

  useEffect(() => {
    if (!selected) return;
    const refreshed = cves.find((item) => item.cveId === selected.cveId);
    if (refreshed && refreshed !== selected) setSelected(refreshed);
  }, [cves, selected]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("argus_theme");
    const savedSidebar = window.localStorage.getItem("argus_sidebar_collapsed");
    if (savedTheme === "terracotta" || savedTheme === "olive" || savedTheme === "graphite") setThemeAccent(savedTheme);
    if (savedSidebar === "true") setSidebarCollapsed(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = themeAccent;
    window.localStorage.setItem("argus_theme", themeAccent);
  }, [themeAccent]);

  useEffect(() => {
    window.localStorage.setItem("argus_sidebar_collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useKeyboardShortcuts(
    () => setCommandOpen(true),
    () => {
      setCommandOpen(false);
      setDrawerOpen(false);
      setEditorOpen(false);
      setLoginOpen(false);
      setSettingsOpen(false);
      setHelpOpen(false);
      setNotificationsOpen(false);
    },
  );

  const openCve = (cve: CveRecord) => {
    setSelected(cve);
    setDrawerTab("Overview");
    setDrawerOpen(true);
    setCommandOpen(false);
  };

  const updateLocalCve = (next: CveRecord) => {
    setSelected(next);
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
    if (!selected) return;
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

  const login = async (provider: string, email = "admin@argus.local", password = "argus-demo") => {
    try {
      if (provider !== "email") {
        const response = await request<{ data: { url: string } }>(`/api/auth/oauth/${provider}`);
        window.location.assign(response.data.url);
        return;
      }
      const response = await request<{ data: { email: string; role: string; accessToken?: string } }>(
        "/api/auth/login",
        { method: "POST", body: JSON.stringify({ email, password }) },
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
              setTriageQuery(result.target);
            }
          } else {
            setPage("components");
            setComponentQuery(result.target);
            setCommandOpen(false);
          }
        },
      })),
    [globalResults],
  );

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-is-collapsed" : ""}`}>
      <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
        <div>
          <div className="wordmark">
            <div>
              <strong>ARGUS</strong>
              <span>软件供应链</span>
            </div>
            <button
              className="icon-button mobile-menu"
              aria-label={sidebarCollapsed ? "展开导航" : "折叠导航"}
              onClick={() => setSidebarCollapsed((value) => !value)}
            >
              {sidebarCollapsed ? <Menu size={18} /> : <PanelLeft size={18} />}
            </button>
          </div>
          <nav className="nav" aria-label="主导航">
            <NavButton
              active={page === "triage"}
              icon={<LayoutList size={17} />}
              label="Triage"
              onClick={() => setPage("triage")}
              collapsed={sidebarCollapsed}
            />
            <NavButton
              active={page === "components"}
              icon={<Boxes size={17} />}
              label="Components"
              onClick={() => setPage("components")}
              collapsed={sidebarCollapsed}
            />
            <NavButton
              active={page === "overview"}
              icon={<ChartNoAxesCombined size={17} />}
              label="Overview"
              onClick={() => setPage("overview")}
              collapsed={sidebarCollapsed}
            />
          </nav>
        </div>
        <div className="sidebar-footer">
          <div className="footer-links">
            <NavButton
              icon={<Settings size={16} />}
              label="设置"
              onClick={() => setSettingsOpen(true)}
              collapsed={sidebarCollapsed}
            />
            <NavButton
              icon={<CircleHelp size={16} />}
              label="帮助"
              onClick={() => setHelpOpen(true)}
              collapsed={sidebarCollapsed}
            />
          </div>
          <NavButton
            icon={<GitBranch size={16} />}
            label="GitHub 仓库"
            onClick={() => window.open("https://github.com/BlackishGreen33/Argus", "_blank", "noopener,noreferrer")}
            collapsed={sidebarCollapsed}
          />
          {!sidebarCollapsed && <div className="footer-note">更安全的软件，更稳定的未来。</div>}
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
            <NotificationBell
              className="notification-button"
              size={36}
              color="orange"
              aria-label={`通知${notificationCount ? `，${notificationCount} 条` : ""}`}
              onClick={() => setNotificationsOpen(true)}
              count={notificationCount}
            />
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

        <CommandPalette
          open={commandOpen}
          query={globalQuery}
          results={paletteResults}
          onQueryChange={setGlobalQuery}
          onClose={() => setCommandOpen(false)}
        />
        <div className="content">
          <PageTransition page={page}>
            {page === "triage" && (
              <TriagePage
                cves={cves}
                selectedIds={selectedIds}
                setSelectedIds={setSelectedIds}
                loading={loading}
                error={error}
                pageTitle={pageTitle}
                pageSubtitle={pageSubtitle}
                localQuery={triageQuery}
                setLocalQuery={(value) => {
                  setTriageQuery(value);
                  setCvePage(1);
                  void loadData();
                }}
                severityFilter={severityFilter}
                statusFilter={statusFilter}
                ecosystemFilter={ecosystemFilter}
                onSeverityChange={(value) => {
                  setSeverityFilter(value);
                  setCvePage(1);
                  void loadData();
                }}
                onStatusFilterChange={(value) => {
                  setStatusFilter(value);
                  setCvePage(1);
                  void loadData();
                }}
                onEcosystemChange={(value) => {
                  setEcosystemFilter(value);
                  setCvePage(1);
                  void loadData();
                }}
                onClearFilters={() => {
                  setSeverityFilter("");
                  setStatusFilter("");
                  setEcosystemFilter("");
                  setCvePage(1);
                  void loadData();
                }}
                onToast={notify}
                openCve={openCve}
                onBatchStatus={batchStatus}
                isAdmin={isAdmin}
                onLogin={() => setLoginOpen(true)}
                page={cvePage}
                pageSize={cvePageSize}
                total={cveTotal}
                onPageChange={(nextPage) => {
                  setCvePage(nextPage);
                  void loadData();
                }}
                onPageSizeChange={(nextPageSize) => {
                  setCvePageSize(nextPageSize);
                  setCvePage(1);
                  void loadData();
                }}
              />
            )}
            {page === "components" && (
              <ComponentsPage
                components={components}
                query={componentQuery}
                setQuery={setComponentQuery}
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
          </PageTransition>
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
          onDelete={() => void deleteSelected()}
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
      <SettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        theme={themeAccent}
        onThemeChange={setThemeAccent}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <HelpPanel open={helpOpen} onOpenChange={setHelpOpen} />
      <NotificationPanel
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
        onCountChange={setNotificationCount}
      />
    </div>
  );
}

"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  Boxes,
  ChartNoAxesCombined,
  CircleHelp,
  GitBranch,
  LayoutList,
  LogIn,
  LogOut,
  Menu,
  PanelLeft,
  RefreshCw,
  Search,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useRef } from "react";

import { argusQueryKeys, useArgusQueries } from "@/client/hooks/useArgusQueries";
import { useKeyboardShortcuts } from "@/client/hooks/useKeyboardShortcuts";
import { useToast } from "@/client/hooks/useToast";
import { request } from "@/client/http";
import { useArgusUiState } from "@/client/state/argus";
import { CommandPalette } from "@/components/CommandPalette";
import { ComponentEditor } from "@/components/components/ComponentEditor";
import { ComponentsPage } from "@/components/components/ComponentsPage";
import { HelpPanel } from "@/components/layout/HelpPanel";
import { NavButton } from "@/components/layout/Navigation";
import { NotificationPanel } from "@/components/layout/NotificationPanel";
import { SettingsPanel } from "@/components/layout/SettingsPanel";
import { LoginDialog } from "@/components/LoginDialog";
import { OverviewPage } from "@/components/overview/OverviewPage";
import { PageTransition } from "@/components/PageTransition";
import { CveDrawer } from "@/components/triage/CveDrawer";
import { CveEditor } from "@/components/triage/CveEditor";
import { TriagePage } from "@/components/triage/TriagePage";
import { NotificationBell } from "@/components/ui/notification-bell";
import { STORAGE_KEYS } from "@/constants/app";
import { useI18n } from "@/i18n";
import type { CveRecord, TriageStatus } from "@/types/domain";
import type { GlobalResult } from "@/types/ui";

type ArgusAppProps = Record<string, never>;

export const ArgusApp: React.FC<ArgusAppProps> = () => {
  const queryClient = useQueryClient();
  const ui = useArgusUiState();
  const drawerTriggerRef = useRef<HTMLElement | null>(null);
  const { notify } = useToast();
  const { t } = useI18n();
  const queries = useArgusQueries({
    query: ui.debouncedTriageQuery,
    page: ui.cvePage,
    pageSize: ui.cvePageSize,
    severity: ui.severityFilter,
    status: ui.statusFilter,
    ecosystem: ui.ecosystemFilter,
  });
  const cves = useMemo(() => queries.cves.data?.data ?? [], [queries.cves.data]);
  const components = queries.components.data?.data ?? [];
  const overviewData = queries.overview.data?.data ?? null;
  const cveTotal = queries.cves.data?.meta?.total ?? cves.length;
  const authPending = queries.user.isPending;
  const authError = queries.user.error?.message ?? null;
  const effectiveIsAdmin = queries.user.isSuccess && queries.user.data?.data.role === "admin";
  const effectiveEmail = queries.user.data?.data.email ?? t("auth.demo.guestEmail");
  const pageLoading =
    ui.page === "triage"
      ? queries.cves.isFetching
      : ui.page === "components"
        ? queries.components.isFetching
        : queries.overview.isFetching;
  const loading = pageLoading || authPending;
  const error =
    ui.page === "triage"
      ? (queries.cves.error?.message ?? null)
      : ui.page === "components"
        ? (queries.components.error?.message ?? null)
        : (queries.overview.error?.message ?? null);
  const loadData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["argus", "cves"] }),
      queryClient.invalidateQueries({ queryKey: argusQueryKeys.components() }),
      queryClient.invalidateQueries({ queryKey: argusQueryKeys.overview() }),
    ]);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => ui.setDebouncedTriageQuery(ui.triageQuery), 220);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.setDebouncedTriageQuery, ui.triageQuery]);

  useEffect(() => {
    const current = ui.selected;
    if (!current) return;
    const refreshed = cves.find((item) => item.cveId === current.cveId);
    if (refreshed && refreshed !== current) ui.setSelected(refreshed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cves, ui.selected, ui.setSelected]);

  useEffect(() => {
    if (!effectiveIsAdmin && ui.selectedIds.length) ui.setSelectedIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveIsAdmin, ui.selectedIds.length, ui.setSelectedIds]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(STORAGE_KEYS.theme);
    const savedSidebar = window.localStorage.getItem(STORAGE_KEYS.sidebarCollapsed);
    if (savedTheme === "terracotta" || savedTheme === "olive" || savedTheme === "graphite") {
      ui.setThemeAccent(savedTheme);
    }
    if (savedSidebar === "true") ui.setSidebarCollapsed(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.setSidebarCollapsed, ui.setThemeAccent]);

  useEffect(() => {
    if (!/Mac|iPhone|iPad/.test(window.navigator.platform)) ui.setShortcutModifier("Ctrl");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.setShortcutModifier]);

  useEffect(() => {
    document.documentElement.dataset.theme = ui.themeAccent;
    window.localStorage.setItem(STORAGE_KEYS.theme, ui.themeAccent);
  }, [ui.themeAccent]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.sidebarCollapsed, String(ui.sidebarCollapsed));
  }, [ui.sidebarCollapsed]);

  const closeDrawer = () => {
    ui.setDrawerOpen(false);
    const trigger = drawerTriggerRef.current;
    if (!trigger) return;
    window.setTimeout(() => {
      if (trigger.isConnected) trigger.focus();
      drawerTriggerRef.current = null;
    }, 0);
  };

  useKeyboardShortcuts(
    () => ui.setCommandOpen(true),
    () => {
      ui.setCommandOpen(false);
      closeDrawer();
      ui.setEditorOpen(false);
      ui.setLoginOpen(false);
      ui.setSettingsOpen(false);
      ui.setHelpOpen(false);
      ui.setNotificationsOpen(false);
    },
  );

  const openCve = (cve: CveRecord) => {
    const activeElement = document.activeElement;
    drawerTriggerRef.current =
      activeElement instanceof HTMLElement && activeElement !== document.body ? activeElement : null;
    ui.setSelected(cve);
    ui.setDrawerTab("Overview");
    ui.setDrawerOpen(true);
    ui.setCommandOpen(false);
  };

  const updateLocalCve = (next: CveRecord) => {
    ui.setSelected(next);
    void loadData();
  };

  const changeStatus = async (cveId: string, status: TriageStatus) => {
    try {
      const response = await request<{ data: CveRecord }>(`/api/cves/${encodeURIComponent(cveId)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      updateLocalCve(response.data);
      notify(
        t("triage.statusUpdated", {
          status: t(
            `status.${status === "PENDING" ? "pending" : status === "CONFIRMED" ? "confirmed" : status === "DEFERRED" ? "deferred" : "falsePositive"}`,
          ),
        }),
      );
    } catch (requestError) {
      notify(requestError instanceof Error ? requestError.message : t("triage.error"));
    }
  };

  const batchStatus = async (status: TriageStatus) => {
    if (!ui.selectedIds.length) return;
    try {
      await request("/api/cves/batch-status", {
        method: "POST",
        body: JSON.stringify({ cveIds: ui.selectedIds, status }),
      });
      ui.setSelectedIds([]);
      notify(t("triage.batchUpdated", { count: ui.selectedIds.length }));
      await loadData();
    } catch (requestError) {
      notify(requestError instanceof Error ? requestError.message : t("triage.error"));
    }
  };

  const deleteSelected = async () => {
    if (!ui.selected) return;
    try {
      await request(`/api/cves/${encodeURIComponent(ui.selected.cveId)}`, { method: "DELETE" });
      closeDrawer();
      ui.setSelected(null);
      notify(t("triage.deleted"));
      await loadData();
    } catch (requestError) {
      notify(requestError instanceof Error ? requestError.message : t("triage.deleteFailed"));
    }
  };

  const login = async (provider: string, email?: string, password?: string) => {
    ui.setAuthActionPending(true);
    try {
      if (provider !== "email") {
        const response = await request<{ data: { url: string } }>(`/api/auth/oauth/${provider}`);
        window.location.assign(response.data.url);
        return;
      }
      const response = await request<{ data: { email: string; role: string } }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      queryClient.setQueryData(argusQueryKeys.user(), { data: response.data });
      ui.setLoginOpen(false);
      notify(t("auth.login.demoSuccess"));
      await loadData();
    } catch (requestError) {
      notify(requestError instanceof Error ? requestError.message : t("auth.login.error"));
    } finally {
      ui.setAuthActionPending(false);
    }
  };

  const logout = async () => {
    ui.setAuthActionPending(true);
    try {
      await request("/api/auth/logout", { method: "POST" });
      ui.setSelectedIds([]);
      queryClient.setQueryData(argusQueryKeys.user(), {
        data: { email: t("auth.demo.guestEmail"), role: "guest" },
      });
      notify(t("auth.logout.success"));
    } catch (requestError) {
      notify(requestError instanceof Error ? requestError.message : t("auth.logout.error"));
    } finally {
      ui.setAuthActionPending(false);
    }
  };

  const retryAuth = () => {
    void queryClient.invalidateQueries({ queryKey: argusQueryKeys.user() });
  };

  const pageTitle = t("page.triage.title");
  const pageSubtitle = t("page.triage.subtitle");

  useEffect(() => {
    if (!ui.globalQuery.trim()) {
      ui.setGlobalResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void request<{ data: GlobalResult[] }>(`/api/search?query=${encodeURIComponent(ui.globalQuery)}`, {
        signal: controller.signal,
      })
        .then((response) => ui.setGlobalResults(response.data))
        .catch(() => {
          if (!controller.signal.aborted) ui.setGlobalResults([]);
        });
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.globalQuery, ui.setGlobalResults]);

  const paletteResults = useMemo(
    () =>
      ui.globalResults.map((result) => ({
        ...result,
        onClick: async () => {
          if (result.type === "CVE") {
            try {
              const response = await request<{ data: CveRecord }>(`/api/cves/${encodeURIComponent(result.target)}`);
              openCve(response.data);
            } catch {
              ui.setPage("triage");
              ui.setTriageQuery(result.target);
            }
          } else {
            ui.setPage("components");
            ui.setComponentQuery(result.target);
            ui.setCommandOpen(false);
          }
        },
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ui.globalResults, openCve, ui.setCommandOpen, ui.setComponentQuery, ui.setPage, ui.setTriageQuery],
  );

  return (
    <div className={`app-shell ${ui.sidebarCollapsed ? "sidebar-is-collapsed" : ""}`}>
      <a className="skip-link" href="#main-content">
        {t("nav.skip")}
      </a>
      <aside className={`sidebar ${ui.sidebarCollapsed ? "collapsed" : ""}`}>
        <div>
          <div className="wordmark">
            <div>
              <strong translate="no">{t("brand.name")}</strong>
              <span>{t("brand.supplyChain")}</span>
            </div>
            <button
              className="icon-button mobile-menu"
              aria-label={t(ui.sidebarCollapsed ? "nav.expand" : "nav.collapse")}
              aria-controls="app-sidebar-nav app-sidebar-footer"
              aria-expanded={!ui.sidebarCollapsed}
              onClick={() => ui.setSidebarCollapsed((value) => !value)}
            >
              <PanelLeft size={18} className="sidebar-toggle-desktop" aria-hidden="true" />
              {ui.sidebarCollapsed ? (
                <Menu size={18} className="sidebar-toggle-mobile" aria-hidden="true" />
              ) : (
                <X size={18} className="sidebar-toggle-mobile" aria-hidden="true" />
              )}
            </button>
          </div>
          <nav id="app-sidebar-nav" className="nav" aria-label={t("nav.main")}>
            <NavButton
              active={ui.page === "triage"}
              icon={<LayoutList size={17} />}
              label={t("nav.triage")}
              onClick={() => ui.setPage("triage")}
              collapsed={ui.sidebarCollapsed}
            />
            <NavButton
              active={ui.page === "components"}
              icon={<Boxes size={17} />}
              label={t("nav.components")}
              onClick={() => ui.setPage("components")}
              collapsed={ui.sidebarCollapsed}
            />
            <NavButton
              active={ui.page === "overview"}
              icon={<ChartNoAxesCombined size={17} />}
              label={t("nav.overview")}
              onClick={() => ui.setPage("overview")}
              collapsed={ui.sidebarCollapsed}
            />
          </nav>
        </div>
        <div id="app-sidebar-footer" className="sidebar-footer">
          <div className="footer-links">
            <NavButton
              icon={<Settings size={16} />}
              label={t("nav.settings")}
              onClick={() => ui.setSettingsOpen(true)}
              collapsed={ui.sidebarCollapsed}
            />
            <NavButton
              icon={<CircleHelp size={16} />}
              label={t("nav.help")}
              onClick={() => ui.setHelpOpen(true)}
              collapsed={ui.sidebarCollapsed}
            />
          </div>
          <NavButton
            icon={<GitBranch size={16} />}
            label={t("nav.github")}
            href="https://github.com/BlackishGreen33/Argus"
            collapsed={ui.sidebarCollapsed}
          />
        </div>
      </aside>

      <main id="main-content" className="main" tabIndex={-1}>
        <header className="topbar">
          <div className="global-search" role="search">
            <Search size={17} aria-hidden="true" />
            <input
              name="global-search"
              autoComplete="off"
              aria-label={t("search.global.label")}
              aria-keyshortcuts="Meta+K Control+K"
              value={ui.globalQuery}
              onChange={(event) => {
                ui.setGlobalQuery(event.target.value);
                ui.setCommandOpen(true);
              }}
              onFocus={() => ui.globalQuery && ui.setCommandOpen(true)}
              placeholder={t("search.global.placeholder")}
            />
            {ui.globalQuery && (
              <button
                type="button"
                className="input-clear"
                aria-label={t("search.clear.global")}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  ui.setGlobalQuery("");
                  ui.setCommandOpen(false);
                }}
              >
                <X size={15} aria-hidden="true" />
              </button>
            )}
            <span className="shortcut" aria-hidden="true">
              {ui.shortcutModifier} K
            </span>
          </div>
          <div className="top-actions">
            <NotificationBell
              className="notification-button"
              size={36}
              color="orange"
              aria-label={
                ui.notificationCount
                  ? t("notifications.labelWithCount", { count: ui.notificationCount })
                  : t("notifications.label")
              }
              onClick={() => ui.setNotificationsOpen(true)}
              count={ui.notificationCount}
            />
            {authPending ? (
              <div className="profile-chip profile-chip-pending" role="status" aria-label={t("auth.pending.label")}>
                <span className="avatar">
                  <UserRound size={15} />
                </span>
                <span className="profile-copy">
                  <strong>{t("auth.pending.title")}</strong>
                  <span>{t("auth.pending.description")}</span>
                </span>
              </div>
            ) : authError ? (
              <button
                className="profile-chip profile-chip-error"
                onClick={retryAuth}
                aria-label={t("auth.error.label")}
              >
                <span className="avatar">
                  <RefreshCw size={15} />
                </span>
                <span className="profile-copy">
                  <strong>{t("auth.error.title")}</strong>
                  <span>{t("auth.error.description")}</span>
                </span>
              </button>
            ) : effectiveIsAdmin ? (
              <button
                className="profile-chip"
                onClick={logout}
                disabled={ui.authActionPending}
                aria-label={t("auth.admin.logout")}
              >
                <span className="avatar">{t("brand.adminInitials")}</span>
                <span className="profile-copy">
                  <strong>{t("auth.admin.title")}</strong>
                  <span>{effectiveEmail}</span>
                </span>
                <LogOut size={15} />
              </button>
            ) : (
              <button className="profile-chip" onClick={() => ui.setLoginOpen(true)} aria-label={t("auth.guest.login")}>
                <span className="avatar">
                  <UserRound size={15} />
                </span>
                <span className="profile-copy">
                  <strong>{t("auth.guest.title")}</strong>
                  <span>{t("auth.guest.description")}</span>
                </span>
                <LogIn size={15} />
              </button>
            )}
          </div>
        </header>

        <CommandPalette
          open={ui.commandOpen}
          query={ui.globalQuery}
          results={paletteResults}
          onQueryChange={ui.setGlobalQuery}
          onClose={() => ui.setCommandOpen(false)}
        />
        <div className="content">
          <PageTransition page={ui.page}>
            {ui.page === "triage" && (
              <TriagePage
                cves={cves}
                selectedIds={ui.selectedIds}
                setSelectedIds={ui.setSelectedIds}
                loading={loading}
                authPending={authPending}
                error={error}
                pageTitle={pageTitle}
                pageSubtitle={pageSubtitle}
                localQuery={ui.triageQuery}
                setLocalQuery={(value) => {
                  ui.setTriageQuery(value);
                  ui.setCvePage(1);
                }}
                severityFilter={ui.severityFilter}
                statusFilter={ui.statusFilter}
                ecosystemFilter={ui.ecosystemFilter}
                onSeverityChange={(value) => {
                  ui.setSeverityFilter(value);
                  ui.setCvePage(1);
                }}
                onStatusFilterChange={(value) => {
                  ui.setStatusFilter(value);
                  ui.setCvePage(1);
                }}
                onEcosystemChange={(value) => {
                  ui.setEcosystemFilter(value);
                  ui.setCvePage(1);
                }}
                onClearFilters={() => {
                  if (!ui.triageQuery.trim() && !ui.severityFilter && !ui.statusFilter && !ui.ecosystemFilter) return;
                  ui.setTriageQuery("");
                  ui.setDebouncedTriageQuery("");
                  ui.setSeverityFilter("");
                  ui.setStatusFilter("");
                  ui.setEcosystemFilter("");
                  ui.setCvePage(1);
                }}
                onToast={notify}
                openCve={openCve}
                onBatchStatus={batchStatus}
                isAdmin={effectiveIsAdmin}
                onLogin={() => ui.setLoginOpen(true)}
                page={ui.cvePage}
                pageSize={ui.cvePageSize}
                total={cveTotal}
                onPageChange={(nextPage) => {
                  ui.setCvePage(nextPage);
                }}
                onPageSizeChange={(nextPageSize) => {
                  ui.setCvePageSize(nextPageSize);
                  ui.setCvePage(1);
                }}
              />
            )}
            {ui.page === "components" && (
              <ComponentsPage
                components={components}
                query={ui.componentQuery}
                setQuery={ui.setComponentQuery}
                loading={loading}
                authPending={authPending}
                isAdmin={effectiveIsAdmin}
                onLogin={() => ui.setLoginOpen(true)}
                onRefresh={() => {
                  void loadData();
                }}
                onEdit={(component) => {
                  ui.setEditingComponent(component);
                  ui.setComponentEditorOpen(true);
                }}
                onCreate={() => {
                  ui.setEditingComponent(null);
                  ui.setComponentEditorOpen(true);
                }}
              />
            )}
            {ui.page === "overview" && (
              <OverviewPage
                data={overviewData}
                loading={loading}
                authPending={authPending}
                isAdmin={effectiveIsAdmin}
                onLogin={() => ui.setLoginOpen(true)}
                onToast={notify}
                onRefresh={loadData}
              />
            )}
          </PageTransition>
        </div>
      </main>

      {ui.drawerOpen && ui.selected && (
        <CveDrawer
          cve={ui.selected}
          tab={ui.drawerTab}
          setTab={ui.setDrawerTab}
          isAdmin={effectiveIsAdmin}
          onLogin={() => ui.setLoginOpen(true)}
          onClose={closeDrawer}
          onStatus={changeStatus}
          onEdit={() => ui.setEditorOpen(true)}
          onDelete={() => void deleteSelected()}
          onCandidate={async (id, status) => {
            await request(`/api/cpe-candidates/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
            notify(t(status === "CONFIRMED" ? "triage.candidateConfirmed" : "triage.candidateRejected"));
            await loadData();
          }}
        />
      )}
      {ui.editorOpen && ui.selected && (
        <CveEditor
          cve={ui.selected}
          onClose={() => ui.setEditorOpen(false)}
          onSaved={(next) => {
            updateLocalCve(next);
            ui.setEditorOpen(false);
            notify(t("triage.saved"));
          }}
        />
      )}
      {ui.componentEditorOpen && (
        <ComponentEditor
          component={ui.editingComponent}
          onClose={() => ui.setComponentEditorOpen(false)}
          onSaved={async () => {
            ui.setComponentEditorOpen(false);
            await loadData();
            notify(t(ui.editingComponent ? "components.updated" : "components.created"));
          }}
          onDeleted={async () => {
            ui.setComponentEditorOpen(false);
            await loadData();
            notify(t("components.deleted"));
          }}
          onError={notify}
        />
      )}
      {ui.loginOpen && (
        <LoginDialog loading={ui.authActionPending} onClose={() => ui.setLoginOpen(false)} onLogin={login} />
      )}
      <SettingsPanel
        open={ui.settingsOpen}
        onOpenChange={ui.setSettingsOpen}
        theme={ui.themeAccent}
        onThemeChange={ui.setThemeAccent}
        collapsed={ui.sidebarCollapsed}
        onCollapsedChange={ui.setSidebarCollapsed}
      />
      <HelpPanel open={ui.helpOpen} onOpenChange={ui.setHelpOpen} />
      <NotificationPanel
        open={ui.notificationsOpen}
        onOpenChange={ui.setNotificationsOpen}
        onCountChange={ui.setNotificationCount}
      />
    </div>
  );
};

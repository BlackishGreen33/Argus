"use client";

import { atom, useAtom } from "jotai";

import { CVE_PAGE_SIZES } from "@/constants/app";
import type { ThemeAccent } from "@/constants/theme";
import type { ComponentRecord, CveRecord } from "@/types/domain";
import type { DrawerTab, GlobalResult, Page } from "@/types/ui";

const argusUiState = {
  page: atom<Page>("triage"),
  cvePage: atom(1),
  cvePageSize: atom<number>(CVE_PAGE_SIZES[0]),
  selected: atom<CveRecord | null>(null),
  drawerTab: atom<DrawerTab>("Overview"),
  drawerOpen: atom(false),
  triageQuery: atom(""),
  debouncedTriageQuery: atom(""),
  componentQuery: atom(""),
  severityFilter: atom(""),
  statusFilter: atom(""),
  ecosystemFilter: atom(""),
  globalQuery: atom(""),
  globalResults: atom<GlobalResult[]>([]),
  commandOpen: atom(false),
  selectedIds: atom<string[]>([]),
  loginOpen: atom(false),
  editorOpen: atom(false),
  componentEditorOpen: atom(false),
  settingsOpen: atom(false),
  helpOpen: atom(false),
  notificationsOpen: atom(false),
  notificationCount: atom(0),
  sidebarCollapsed: atom(false),
  themeAccent: atom<ThemeAccent>("terracotta"),
  shortcutModifier: atom("⌘"),
  editingComponent: atom<ComponentRecord | null>(null),
  authActionPending: atom(false),
};

export function useArgusUiState() {
  const state = argusUiState;
  const [page, setPage] = useAtom(state.page);
  const [cvePage, setCvePage] = useAtom(state.cvePage);
  const [cvePageSize, setCvePageSize] = useAtom(state.cvePageSize);
  const [selected, setSelected] = useAtom(state.selected);
  const [drawerTab, setDrawerTab] = useAtom(state.drawerTab);
  const [drawerOpen, setDrawerOpen] = useAtom(state.drawerOpen);
  const [triageQuery, setTriageQuery] = useAtom(state.triageQuery);
  const [debouncedTriageQuery, setDebouncedTriageQuery] = useAtom(state.debouncedTriageQuery);
  const [componentQuery, setComponentQuery] = useAtom(state.componentQuery);
  const [severityFilter, setSeverityFilter] = useAtom(state.severityFilter);
  const [statusFilter, setStatusFilter] = useAtom(state.statusFilter);
  const [ecosystemFilter, setEcosystemFilter] = useAtom(state.ecosystemFilter);
  const [globalQuery, setGlobalQuery] = useAtom(state.globalQuery);
  const [globalResults, setGlobalResults] = useAtom(state.globalResults);
  const [commandOpen, setCommandOpen] = useAtom(state.commandOpen);
  const [selectedIds, setSelectedIds] = useAtom(state.selectedIds);
  const [loginOpen, setLoginOpen] = useAtom(state.loginOpen);
  const [editorOpen, setEditorOpen] = useAtom(state.editorOpen);
  const [componentEditorOpen, setComponentEditorOpen] = useAtom(state.componentEditorOpen);
  const [settingsOpen, setSettingsOpen] = useAtom(state.settingsOpen);
  const [helpOpen, setHelpOpen] = useAtom(state.helpOpen);
  const [notificationsOpen, setNotificationsOpen] = useAtom(state.notificationsOpen);
  const [notificationCount, setNotificationCount] = useAtom(state.notificationCount);
  const [sidebarCollapsed, setSidebarCollapsed] = useAtom(state.sidebarCollapsed);
  const [themeAccent, setThemeAccent] = useAtom(state.themeAccent);
  const [shortcutModifier, setShortcutModifier] = useAtom(state.shortcutModifier);
  const [editingComponent, setEditingComponent] = useAtom(state.editingComponent);
  const [authActionPending, setAuthActionPending] = useAtom(state.authActionPending);

  return {
    page,
    setPage,
    cvePage,
    setCvePage,
    cvePageSize,
    setCvePageSize,
    selected,
    setSelected,
    drawerTab,
    setDrawerTab,
    drawerOpen,
    setDrawerOpen,
    triageQuery,
    setTriageQuery,
    debouncedTriageQuery,
    setDebouncedTriageQuery,
    componentQuery,
    setComponentQuery,
    severityFilter,
    setSeverityFilter,
    statusFilter,
    setStatusFilter,
    ecosystemFilter,
    setEcosystemFilter,
    globalQuery,
    setGlobalQuery,
    globalResults,
    setGlobalResults,
    commandOpen,
    setCommandOpen,
    selectedIds,
    setSelectedIds,
    loginOpen,
    setLoginOpen,
    editorOpen,
    setEditorOpen,
    componentEditorOpen,
    setComponentEditorOpen,
    settingsOpen,
    setSettingsOpen,
    helpOpen,
    setHelpOpen,
    notificationsOpen,
    setNotificationsOpen,
    notificationCount,
    setNotificationCount,
    sidebarCollapsed,
    setSidebarCollapsed,
    themeAccent,
    setThemeAccent,
    shortcutModifier,
    setShortcutModifier,
    editingComponent,
    setEditingComponent,
    authActionPending,
    setAuthActionPending,
  };
}

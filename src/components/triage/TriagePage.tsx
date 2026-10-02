"use client";

import { AlertTriangle, Check, FileSearch, FilterX, Lock, Search, X } from "lucide-react";
import type React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CVE_PAGE_SIZES, CVSS_MAX_SCORE } from "@/constants/app";
import { useI18n } from "@/i18n";
import type { CveRecord, TriageStatus } from "@/types/domain";
import { formatDate, statusClass } from "@/utils/format";
import { severityLabelKeys, statusLabelKeys } from "@/utils/labels";

const cvssProgress = (score: number | null | undefined) => {
  const numericScore = Number(score);
  const normalizedScore = Number.isFinite(numericScore) ? Math.min(Math.max(numericScore, 0), CVSS_MAX_SCORE) : 0;
  return `${Math.round((normalizedScore / CVSS_MAX_SCORE) * 100)}%`;
};

interface TriagePageProps {
  cves: CveRecord[];
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  loading: boolean;
  authPending: boolean;
  error: string | null;
  pageTitle: string;
  pageSubtitle: string;
  localQuery: string;
  setLocalQuery: (value: string) => void;
  severityFilter: string;
  statusFilter: string;
  ecosystemFilter: string;
  onSeverityChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onEcosystemChange: (value: string) => void;
  onClearFilters: () => void;
  onToast: (message: string) => void;
  openCve: (cve: CveRecord) => void;
  onBatchStatus: (status: TriageStatus) => void;
  isAdmin: boolean;
  onLogin: () => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export const TriagePage: React.FC<TriagePageProps> = ({
  cves,
  selectedIds,
  setSelectedIds,
  loading,
  authPending,
  error,
  pageTitle,
  pageSubtitle,
  localQuery,
  setLocalQuery,
  severityFilter,
  statusFilter,
  ecosystemFilter,
  onSeverityChange,
  onStatusFilterChange,
  onEcosystemChange,
  onClearFilters,
  onToast,
  openCve,
  onBatchStatus,
  isAdmin,
  onLogin,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}) => {
  const { locale, t } = useI18n();
  const allSelected = cves.length > 0 && cves.every((item) => selectedIds.includes(item.cveId));
  const columnCount = isAdmin ? 7 : 6;
  const hasActiveFilters = Boolean(localQuery.trim() || severityFilter || statusFilter || ecosystemFilter);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const pages = Array.from({ length: Math.min(pageCount, 5) }, (_, index) => index + 1);
  const toggleRow = (cveId: string, checked: boolean) => {
    if (!isAdmin) return;
    setSelectedIds(checked ? [...new Set([...selectedIds, cveId])] : selectedIds.filter((id) => id !== cveId));
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <h1 className="display-title">{pageTitle}</h1>
          <p>{pageSubtitle}</p>
        </div>
      </div>

      <div className="filter-row">
        <div className="local-search">
          <Search size={17} aria-hidden="true" />
          <Input
            name="triage-search"
            autoComplete="off"
            value={localQuery}
            onChange={(event) => setLocalQuery(event.target.value)}
            placeholder={t("search.local.cve.placeholder")}
            aria-label={t("search.local.cve.label")}
          />
          {localQuery && (
            <button
              type="button"
              className="input-clear"
              aria-label={t("search.clear.cve")}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setLocalQuery("")}
            >
              <X size={15} aria-hidden="true" />
            </button>
          )}
        </div>
        <Select
          value={severityFilter || undefined}
          placeholder={t("filter.severity")}
          aria-label={t("filter.severity")}
          onValueChange={onSeverityChange}
        >
          <SelectTrigger className="filter-select" aria-label={t("filter.severity")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CRITICAL">{t("severity.critical")}</SelectItem>
            <SelectItem value="HIGH">{t("severity.high")}</SelectItem>
            <SelectItem value="MEDIUM">{t("severity.medium")}</SelectItem>
            <SelectItem value="LOW">{t("severity.low")}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={ecosystemFilter || undefined}
          placeholder={t("filter.ecosystem")}
          aria-label={t("filter.ecosystem")}
          onValueChange={onEcosystemChange}
        >
          <SelectTrigger className="filter-select" aria-label={t("filter.ecosystem")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="maven">{t("components.type.maven")}</SelectItem>
            <SelectItem value="npm">{t("components.type.npm")}</SelectItem>
            <SelectItem value="pypi">{t("components.type.pypi")}</SelectItem>
            <SelectItem value="golang">{t("components.type.golang")}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter || undefined}
          placeholder={t("filter.status")}
          aria-label={t("filter.status")}
          onValueChange={onStatusFilterChange}
        >
          <SelectTrigger className="filter-select" aria-label={t("filter.status")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">{t("status.pending")}</SelectItem>
            <SelectItem value="CONFIRMED">{t("status.confirmed")}</SelectItem>
            <SelectItem value="DEFERRED">{t("status.deferred")}</SelectItem>
            <SelectItem value="FALSE_POSITIVE">{t("status.falsePositive")}</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={onClearFilters} className="filter-clear" disabled={!hasActiveFilters}>
          <FilterX size={15} aria-hidden="true" /> {t("filter.clear")}
        </Button>
      </div>

      {!authPending && !isAdmin && (
        <div className="batch-bar">
          <Lock size={15} aria-hidden="true" />
          <span>{t("triage.guestBanner")}</span>
          <Button size="sm" onClick={onLogin}>
            {t("auth.guest.login")}
          </Button>
        </div>
      )}
      {selectedIds.length > 0 && isAdmin && (
        <div className="batch-bar">
          <Check size={15} aria-hidden="true" />
          <span>{t("triage.batchSelected", { count: selectedIds.length })}</span>
          <Button size="sm" variant="outline" onClick={() => onBatchStatus("CONFIRMED")}>
            {t("triage.batch.confirmed")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => onBatchStatus("DEFERRED")}>
            {t("triage.batch.deferred")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => onBatchStatus("FALSE_POSITIVE")}>
            {t("triage.batch.falsePositive")}
          </Button>
        </div>
      )}

      <div className="table-shell" aria-busy={loading} aria-live="polite">
        <Table className="argus-table" data-selection-enabled={isAdmin ? "true" : "false"}>
          <TableHeader>
            <TableRow>
              {isAdmin && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected ? true : selectedIds.length > 0 ? "indeterminate" : false}
                    onCheckedChange={(checked) =>
                      setSelectedIds(checked === true ? cves.map((item) => item.cveId) : [])
                    }
                    aria-label={t("triage.selectAll")}
                  />
                </TableHead>
              )}
              <TableHead className="w-24">{t("triage.column.severity")}</TableHead>
              <TableHead className="w-44">{t("triage.column.cve")}</TableHead>
              <TableHead>{t("triage.column.title")}</TableHead>
              <TableHead className="w-24">{t("triage.column.cvss")}</TableHead>
              <TableHead className="w-32">{t("triage.column.updated")}</TableHead>
              <TableHead className="w-24">{t("triage.column.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: pageSize }, (rowKey, rowIndex) => (
                <TableRow key={`loading-${rowIndex}`} className="h-16">
                  {Array.from({ length: columnCount }, (cellKey, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!loading && error && (
              <TableRow>
                <TableCell colSpan={columnCount}>
                  <div className="empty-state">
                    <AlertTriangle size={18} /> {error}
                  </div>
                </TableCell>
              </TableRow>
            )}
            {!loading && !error && !cves.length && (
              <TableRow>
                <TableCell colSpan={columnCount}>
                  <div className="empty-state">
                    <FileSearch size={18} /> {t("triage.noMatches")}
                  </div>
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              !error &&
              cves.map((cve) => (
                <ContextMenu key={cve.cveId}>
                  <ContextMenuTrigger asChild>
                    <TableRow
                      data-state={selectedIds.includes(cve.cveId) ? "selected" : undefined}
                      className={`argus-table-row severity-${cve.severity?.toLowerCase() ?? "low"} h-16 cursor-pointer`}
                      tabIndex={0}
                      onClick={(event) => {
                        event.currentTarget.focus();
                        openCve(cve);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openCve(cve);
                        }
                      }}
                      aria-label={t("triage.viewRow", { id: cve.cveId })}
                    >
                      {isAdmin && (
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.includes(cve.cveId)}
                            onCheckedChange={(checked) => toggleRow(cve.cveId, checked === true)}
                            aria-label={t("triage.select", { id: cve.cveId })}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <span className="severity-cell whitespace-nowrap">
                          <i className={`severity-dot ${cve.severity}`} />
                          {t(severityLabelKeys[cve.severity ?? ""] ?? "triage.noValue")}
                        </span>
                      </TableCell>
                      <TableCell className="cell-muted font-medium" translate="no">
                        {cve.cveId}
                      </TableCell>
                      <TableCell className="triage-title-cell">
                        <div className="cell-title">
                          <strong title={cve.title ?? t("triage.noTitle")}>{cve.title ?? t("triage.noTitle")}</strong>
                          <span title={cve.candidates[0]?.componentName ?? t("triage.noComponent")}>
                            {cve.candidates[0]?.componentName ?? t("triage.noComponent")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className="cvss"
                          style={
                            {
                              "--cvss-progress": cvssProgress(cve.cvssScoreV3 ?? cve.cvssScoreV4),
                            } as React.CSSProperties
                          }
                        >
                          <span className="cvss-value">
                            {cve.cvssScoreV3 ?? cve.cvssScoreV4 ?? t("triage.noValue")}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="cell-muted">
                        {formatDate(cve.sourceUpdateDate, locale, t("triage.noValue"))}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`status-badge ${statusClass(cve.triageStatus)}`}>
                          {t(statusLabelKeys[cve.triageStatus])}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuLabel>{t("triage.contextActions", { id: cve.cveId })}</ContextMenuLabel>
                    <ContextMenuSeparator />
                    <ContextMenuItem onSelect={() => openCve(cve)}>{t("action.showDetails")}</ContextMenuItem>
                    <ContextMenuItem
                      onSelect={() => {
                        if (!navigator.clipboard) {
                          onToast(t("triage.copyUnsupported"));
                          return;
                        }
                        void navigator.clipboard
                          .writeText(cve.cveId)
                          .then(() => onToast(t("action.copySuccess")))
                          .catch(() => onToast(t("action.copyFailure")));
                      }}
                    >
                      {t("triage.copyCve")}
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
          </TableBody>
        </Table>
      </div>

      <div className="table-footer">
        <span>
          {loading
            ? t("triage.loading")
            : selectedIds.length
              ? t("triage.selectedShort", { count: selectedIds.length })
              : t("triage.totalShort", { count: total })}
        </span>
        <div className="pagination-tools">
          <span>{t("triage.pageSize")}</span>
          <Select
            value={String(pageSize)}
            aria-label={t("triage.pageSizeAria")}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="page-size-select" aria-label={t("triage.pageSizeAria")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CVE_PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Pagination className="pagination-inline">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  text=""
                  href="#"
                  aria-disabled={page === 1}
                  tabIndex={page === 1 ? -1 : 0}
                  className={page === 1 ? "pointer-events-none opacity-50" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    onPageChange(Math.max(1, page - 1));
                  }}
                />
              </PaginationItem>
              {pages.map((item) => (
                <PaginationItem key={item}>
                  <PaginationLink
                    href="#"
                    isActive={item === page}
                    onClick={(event) => {
                      event.preventDefault();
                      onPageChange(item);
                    }}
                  >
                    {item}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  text=""
                  href="#"
                  aria-disabled={page >= pageCount}
                  tabIndex={page >= pageCount ? -1 : 0}
                  className={page >= pageCount ? "pointer-events-none opacity-50" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    onPageChange(Math.min(pageCount, page + 1));
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </>
  );
};

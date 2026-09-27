"use client";

import { AlertTriangle, Check, FileSearch, FilterX, Lock, Search } from "lucide-react";
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
import type { CveRecord, TriageStatus } from "@/types/domain";
import { formatDate, statusClass } from "@/utils/format";
import { severityLabels, statusLabels } from "@/utils/labels";

const PAGE_SIZES = [10, 20, 50];

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
  const allSelected = cves.length > 0 && cves.every((item) => selectedIds.includes(item.cveId));
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const pages = Array.from({ length: Math.min(pageCount, 5) }, (_, index) => index + 1);
  const toggleRow = (cveId: string, checked: boolean) => {
    setSelectedIds(checked ? [...new Set([...selectedIds, cveId])] : selectedIds.filter((id) => id !== cveId));
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">漏洞管理</div>
          <h1 className="serif">{pageTitle}</h1>
          <p>{pageSubtitle}</p>
        </div>
        <div className="heading-note">更小的风险，创造更具韧性的未来。</div>
      </div>

      <div className="filter-row">
        <div className="local-search">
          <Search size={17} aria-hidden="true" />
          <Input
            value={localQuery}
            onChange={(event) => setLocalQuery(event.target.value)}
            placeholder="筛选 CVE ID、组件或关键字…"
            aria-label="筛选当前漏洞列表"
          />
        </div>
        <Select value={severityFilter || undefined} placeholder="严重度" onValueChange={onSeverityChange}>
          <SelectTrigger className="filter-select" aria-label="严重度">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CRITICAL">严重</SelectItem>
            <SelectItem value="HIGH">高</SelectItem>
            <SelectItem value="MEDIUM">中</SelectItem>
            <SelectItem value="LOW">低</SelectItem>
          </SelectContent>
        </Select>
        <Select value={ecosystemFilter || undefined} placeholder="生态系" onValueChange={onEcosystemChange}>
          <SelectTrigger className="filter-select" aria-label="生态系">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="maven">Maven</SelectItem>
            <SelectItem value="npm">npm</SelectItem>
            <SelectItem value="pypi">PyPI</SelectItem>
            <SelectItem value="golang">Go</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter || undefined} placeholder="状态" onValueChange={onStatusFilterChange}>
          <SelectTrigger className="filter-select" aria-label="状态">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">待处理</SelectItem>
            <SelectItem value="CONFIRMED">已确认</SelectItem>
            <SelectItem value="DEFERRED">已延后</SelectItem>
            <SelectItem value="FALSE_POSITIVE">误报</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={onClearFilters} className="filter-clear">
          <FilterX size={15} aria-hidden="true" /> 清除筛选
        </Button>
      </div>

      {!authPending && !isAdmin && (
        <div className="batch-bar">
          <Lock size={15} aria-hidden="true" />
          <span>当前为访客浏览模式，登录后可修改、批量处理与删除。</span>
          <Button size="sm" onClick={onLogin}>
            登录 Admin
          </Button>
        </div>
      )}
      {selectedIds.length > 0 && isAdmin && (
        <div className="batch-bar">
          <Check size={15} aria-hidden="true" />
          <span>已选择 {selectedIds.length} 条漏洞</span>
          <Button size="sm" variant="outline" onClick={() => onBatchStatus("CONFIRMED")}>
            批量确认
          </Button>
          <Button size="sm" variant="outline" onClick={() => onBatchStatus("DEFERRED")}>
            批量延后
          </Button>
          <Button size="sm" variant="outline" onClick={() => onBatchStatus("FALSE_POSITIVE")}>
            标记误报
          </Button>
        </div>
      )}

      <div className="table-shell" aria-busy={loading} aria-live="polite">
        <Table className="argus-table min-w-[880px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected ? true : selectedIds.length > 0 ? "indeterminate" : false}
                  onCheckedChange={(checked) => setSelectedIds(checked === true ? cves.map((item) => item.cveId) : [])}
                  aria-label="全选当前页"
                />
              </TableHead>
              <TableHead className="w-24">严重度</TableHead>
              <TableHead className="w-44">CVE ID</TableHead>
              <TableHead>标题</TableHead>
              <TableHead className="w-24">CVSS v3.1</TableHead>
              <TableHead className="w-32">最后更新</TableHead>
              <TableHead className="w-24">状态</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: pageSize }, (rowKey, rowIndex) => (
                <TableRow key={`loading-${rowIndex}`} className="h-16">
                  {Array.from({ length: 7 }, (cellKey, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!loading && error && (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="empty-state">
                    <AlertTriangle size={18} /> {error}
                  </div>
                </TableCell>
              </TableRow>
            )}
            {!loading && !error && !cves.length && (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="empty-state">
                    <FileSearch size={18} /> 没有匹配的漏洞
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
                      className="argus-table-row h-16 cursor-pointer"
                      tabIndex={0}
                      onClick={() => openCve(cve)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openCve(cve);
                        }
                      }}
                      aria-label={`查看 ${cve.cveId}，右键或长按打开操作菜单`}
                    >
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(cve.cveId)}
                          onCheckedChange={(checked) => toggleRow(cve.cveId, checked === true)}
                          aria-label={`选择 ${cve.cveId}`}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="severity-cell whitespace-nowrap">
                          <i className={`severity-dot ${cve.severity}`} />
                          {severityLabels[cve.severity ?? ""] ?? cve.severity}
                        </span>
                      </TableCell>
                      <TableCell className="cell-muted font-medium">{cve.cveId}</TableCell>
                      <TableCell className="max-w-[360px]">
                        <div className="cell-title">
                          <strong title={cve.title ?? "未命名漏洞"}>{cve.title ?? "未命名漏洞"}</strong>
                          <span title={cve.candidates[0]?.componentName ?? "未匹配组件"}>
                            {cve.candidates[0]?.componentName ?? "未匹配组件"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="cvss">{cve.cvssScoreV3 ?? cve.cvssScoreV4 ?? "—"}</TableCell>
                      <TableCell className="cell-muted">{formatDate(cve.sourceUpdateDate)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`status-badge ${statusClass(cve.triageStatus)}`}>
                          {statusLabels[cve.triageStatus]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuLabel>{cve.cveId} 操作</ContextMenuLabel>
                    <ContextMenuSeparator />
                    <ContextMenuItem onSelect={() => openCve(cve)}>查看详情</ContextMenuItem>
                    <ContextMenuItem
                      onSelect={() => {
                        if (!navigator.clipboard) {
                          onToast("当前浏览器不支持复制，请手动选择 CVE ID");
                          return;
                        }
                        void navigator.clipboard
                          .writeText(cve.cveId)
                          .then(() => onToast("已复制 CVE ID"))
                          .catch(() => onToast("复制失败，请手动选择 CVE ID"));
                      }}
                    >
                      复制 CVE ID
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
          </TableBody>
        </Table>
      </div>

      <div className="table-footer">
        <span>
          {loading ? "正在加载漏洞…" : selectedIds.length ? `已选择 ${selectedIds.length} 条` : `共 ${total} 条漏洞`}
        </span>
        <div className="pagination-tools">
          <span>每页显示</span>
          <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
            <SelectTrigger className="page-size-select" aria-label="每页显示数量">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
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

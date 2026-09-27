"use client";

import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  Lock,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import type { CveRecord, TriageStatus } from "@/types/domain";
import { formatDate, statusClass } from "@/utils/format";
import { severityLabels, statusLabels } from "@/utils/labels";

export function TriagePage({
  cves,
  selectedIds,
  setSelectedIds,
  loading,
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
  openCve,
  onBatchStatus,
  isAdmin,
  onLogin,
}: {
  cves: CveRecord[];
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  loading: boolean;
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
  openCve: (cve: CveRecord) => void;
  onBatchStatus: (status: TriageStatus) => void;
  isAdmin: boolean;
  onLogin: () => void;
}) {
  const allSelected = cves.length > 0 && cves.every((item) => selectedIds.includes(item.cveId));
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
          <Search size={17} />
          <input
            value={localQuery}
            onChange={(event) => setLocalQuery(event.target.value)}
            placeholder="筛选 CVE ID、组件或关键字…"
            aria-label="筛选当前漏洞列表"
          />
        </div>
        <label className="select-wrap">
          <span className="sr-only">严重度</span>
          <select
            className="select-button"
            value={severityFilter}
            onChange={(event) => onSeverityChange(event.target.value)}
          >
            <option value="">严重度</option>
            <option value="CRITICAL">严重</option>
            <option value="HIGH">高</option>
            <option value="MEDIUM">中</option>
            <option value="LOW">低</option>
          </select>
        </label>
        <label className="select-wrap">
          <span className="sr-only">生态系</span>
          <select
            className="select-button"
            value={ecosystemFilter}
            onChange={(event) => onEcosystemChange(event.target.value)}
          >
            <option value="">生态系</option>
            <option value="maven">Maven</option>
            <option value="npm">npm</option>
            <option value="pypi">PyPI</option>
            <option value="golang">Go</option>
          </select>
        </label>
        <label className="select-wrap">
          <span className="sr-only">状态</span>
          <select
            className="select-button"
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value)}
          >
            <option value="">状态</option>
            <option value="PENDING">待处理</option>
            <option value="CONFIRMED">已确认</option>
            <option value="DEFERRED">已延后</option>
            <option value="FALSE_POSITIVE">误报</option>
          </select>
        </label>
        <button className="select-button" onClick={onClearFilters}>
          <SlidersHorizontal size={15} /> 清除筛选
        </button>
      </div>
      {!isAdmin && (
        <div className="batch-bar">
          <Lock size={15} />
          <span>当前为访客浏览模式，登录后可修改、批量处理与删除。</span>
          <button className="primary-button small-button" onClick={onLogin}>
            登录 Admin
          </button>
        </div>
      )}
      {selectedIds.length > 0 && isAdmin && (
        <div className="batch-bar">
          <Check size={15} />
          <span>已选择 {selectedIds.length} 条漏洞</span>
          <button className="secondary-button small-button" onClick={() => onBatchStatus("CONFIRMED")}>
            批量确认
          </button>
          <button className="secondary-button small-button" onClick={() => onBatchStatus("DEFERRED")}>
            批量延后
          </button>
          <button className="secondary-button small-button" onClick={() => onBatchStatus("FALSE_POSITIVE")}>
            标记误报
          </button>
        </div>
      )}
      <div className="table-shell" aria-live="polite">
        <div className="table-head">
          <span>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => setSelectedIds(allSelected ? [] : cves.map((item) => item.cveId))}
              aria-label="全选"
            />
          </span>
          <span>严重度</span>
          <span>CVE ID</span>
          <span>标题</span>
          <span>CVSS v3.1</span>
          <span>最后更新</span>
          <span>状态</span>
          <span />
        </div>
        {loading && <div className="empty-state">正在加载漏洞数据…</div>}
        {!loading && error && (
          <div className="empty-state">
            <AlertTriangle size={18} /> {error}
          </div>
        )}
        {!loading && !error && !cves.length && (
          <div className="empty-state">
            <FileSearch size={18} /> 没有匹配的漏洞
          </div>
        )}
        {!loading &&
          !error &&
          cves.map((cve) => (
            <button
              className={`table-row ${selectedIds.includes(cve.cveId) ? "selected" : ""}`}
              key={cve.cveId}
              onClick={() => openCve(cve)}
            >
              <span onClick={(event) => event.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(cve.cveId)}
                  onChange={(event) =>
                    setSelectedIds(
                      event.target.checked ? [...selectedIds, cve.cveId] : selectedIds.filter((id) => id !== cve.cveId),
                    )
                  }
                  aria-label={`选择 ${cve.cveId}`}
                />
              </span>
              <span className="severity-cell">
                <i className={`severity-dot ${cve.severity}`} />
                {severityLabels[cve.severity ?? ""] ?? cve.severity}
              </span>
              <span className="cell-muted">{cve.cveId}</span>
              <span className="cell-title">
                <strong>{cve.title}</strong>
                <span>{cve.candidates[0]?.componentName ?? "未匹配组件"}</span>
              </span>
              <span className="cvss">{cve.cvssScoreV3 ?? cve.cvssScoreV4 ?? "—"}</span>
              <span className="cell-muted">{formatDate(cve.sourceUpdateDate)}</span>
              <span className={`status-label ${statusClass(cve.triageStatus)}`}>{statusLabels[cve.triageStatus]}</span>
              <span>
                <MoreHorizontal size={17} />
              </span>
            </button>
          ))}
      </div>
      <div className="table-footer">
        <span>
          {selectedIds.length ? `已选择 ${selectedIds.length} 条，共 ${cves.length} 条` : `共 ${cves.length} 条漏洞`}
        </span>
        <span className="pagination">
          <span>每页显示</span>
          <button className="select-button small-button">
            10 <ChevronDown size={13} />
          </button>
          <button className="page-button">
            <ChevronLeft size={15} />
          </button>
          <button className="page-button active">1</button>
          <button className="page-button">2</button>
          <button className="page-button">3</button>
          <button className="page-button">
            <ChevronRight size={15} />
          </button>
        </span>
      </div>
    </>
  );
}

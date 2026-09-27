"use client";

import { Filter, MoreHorizontal, Plus, RotateCw, Search } from "lucide-react";

import type { ComponentRecord } from "@/types/domain";
import { formatDate } from "@/utils/format";

export function ComponentsPage({
  components,
  query,
  setQuery,
  loading,
  isAdmin,
  onLogin,
  onRefresh,
  onEdit,
  onCreate,
}: {
  components: ComponentRecord[];
  query: string;
  setQuery: (value: string) => void;
  loading: boolean;
  isAdmin: boolean;
  onLogin: () => void;
  onRefresh: () => void;
  onEdit: (component: ComponentRecord) => void;
  onCreate: () => void;
}) {
  const visibleComponents = components.filter((component) =>
    `${component.purl} ${component.name} ${component.vendor ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">供应链证据</div>
          <h1 className="serif">Components</h1>
          <p>维护可追踪、可复核的组件元数据。</p>
        </div>
        <button className="primary-button" onClick={isAdmin ? onCreate : onLogin}>
          <Plus size={16} /> 新增组件
        </button>
      </div>
      <div className="filter-row">
        <div className="local-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索 PURL、名称或供应商…"
            aria-label="筛选组件列表"
          />
        </div>
        <button className="select-button" onClick={onRefresh}>
          <RotateCw size={15} /> 刷新
        </button>
        <button className="select-button">
          <Filter size={15} /> 类型
        </button>
      </div>
      <div className="table-shell">
        <div
          className="table-head"
          style={{ gridTemplateColumns: "minmax(220px,1.2fr) 120px minmax(150px,1fr) 140px 120px 80px" }}
        >
          <span>PURL</span>
          <span>类型</span>
          <span>名称</span>
          <span>版本</span>
          <span>记录时间</span>
          <span />
        </div>
        {loading && <div className="empty-state">正在加载组件…</div>}
        {!loading && !visibleComponents.length && <div className="empty-state">暂无组件记录</div>}
        {visibleComponents.map((component) => (
          <button
            className="table-row"
            style={{ gridTemplateColumns: "minmax(220px,1.2fr) 120px minmax(150px,1fr) 140px 120px 80px" }}
            key={component.purl}
            onClick={() => (isAdmin ? onEdit(component) : onLogin())}
          >
            <span className="cell-title">
              <strong>{component.purl}</strong>
              <span>{component.cpe ?? "未提供 CPE"}</span>
            </span>
            <span>{component.type ?? "—"}</span>
            <span>
              {component.vendor ? `${component.vendor} / ` : ""}
              {component.name}
            </span>
            <span>{component.version}</span>
            <span className="cell-muted">{formatDate(component.recordTime)}</span>
            <span>
              <MoreHorizontal size={17} />
            </span>
          </button>
        ))}
      </div>
      <div className="table-footer">
        <span>共 {visibleComponents.length} 个组件</span>
        <span className="cell-muted">PURL 创建后锁定</span>
      </div>
    </>
  );
}

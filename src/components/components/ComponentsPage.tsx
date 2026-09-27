"use client";

import { Filter, Pencil, Plus, RotateCw, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ComponentRecord } from "@/types/domain";
import { formatDate } from "@/utils/format";

const PAGE_SIZE = 25;

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
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const visibleComponents = useMemo(
    () =>
      components.filter(
        (component) =>
          `${component.purl} ${component.name} ${component.vendor ?? ""}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()) &&
          (!typeFilter || component.type?.toLowerCase() === typeFilter),
      ),
    [components, query, typeFilter],
  );
  const pageCount = Math.max(1, Math.ceil(visibleComponents.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = visibleComponents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">供应链证据</div>
          <h1 className="serif">Components</h1>
          <p>维护可追踪、可复核的组件元数据。</p>
        </div>
        <Button onClick={isAdmin ? onCreate : onLogin}>
          <Plus size={16} /> 新增组件
        </Button>
      </div>
      <div className="filter-row">
        <div className="local-search">
          <Search size={17} aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="搜索 PURL、名称或供应商…"
            aria-label="筛选组件列表"
          />
        </div>
        <Button variant="outline" onClick={onRefresh}>
          <RotateCw size={15} /> 刷新
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" aria-label="按组件类型筛选">
              <Filter size={15} /> {typeFilter ? `类型：${typeFilter}` : "类型"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup
              value={typeFilter || "all"}
              onValueChange={(value) => {
                setTypeFilter(value === "all" ? "" : value);
                setPage(1);
              }}
            >
              <DropdownMenuRadioItem value="all">全部类型</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="maven">Maven</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="npm">npm</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="pypi">PyPI</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="golang">Go</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="table-shell">
        <Table className="argus-table min-w-[880px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[31%]">PURL</TableHead>
              <TableHead className="w-24">类型</TableHead>
              <TableHead>名称</TableHead>
              <TableHead className="w-32">版本</TableHead>
              <TableHead className="w-32">记录时间</TableHead>
              <TableHead className="w-16">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="empty-state">正在加载组件…</div>
                </TableCell>
              </TableRow>
            )}
            {!loading && !pageItems.length && (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="empty-state">暂无组件记录</div>
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              pageItems.map((component) => (
                <TableRow
                  key={component.purl}
                  className="argus-table-row h-16 cursor-pointer"
                  tabIndex={0}
                  onClick={() => (isAdmin ? onEdit(component) : onLogin())}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      isAdmin ? onEdit(component) : onLogin();
                    }
                  }}
                >
                  <TableCell className="max-w-[300px]">
                    <div className="cell-title">
                      <strong title={component.purl}>{component.purl}</strong>
                      <span title={component.cpe ?? "未提供 CPE"}>{component.cpe ?? "未提供 CPE"}</span>
                    </div>
                  </TableCell>
                  <TableCell>{component.type ?? "—"}</TableCell>
                  <TableCell
                    className="max-w-[220px] truncate"
                    title={`${component.vendor ? `${component.vendor} / ` : ""}${component.name}`}
                  >
                    {component.vendor ? `${component.vendor} / ` : ""}
                    {component.name}
                  </TableCell>
                  <TableCell>{component.version}</TableCell>
                  <TableCell className="cell-muted">{formatDate(component.recordTime)}</TableCell>
                  <TableCell className="w-12" onClick={(event) => event.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`编辑 ${component.name}`}
                      title="编辑组件"
                      onClick={() => (isAdmin ? onEdit(component) : onLogin())}
                    >
                      <Pencil size={15} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
      <div className="table-footer">
        <span>共 {visibleComponents.length} 个组件</span>
        <div className="pagination-tools">
          <span className="cell-muted">PURL 创建后锁定</span>
          <Pagination className="pagination-inline">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  text=""
                  href="#"
                  aria-disabled={currentPage === 1}
                  tabIndex={currentPage === 1 ? -1 : 0}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    setPage(Math.max(1, currentPage - 1));
                  }}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(pageCount, 5) }, (_, index) => index + 1).map((item) => (
                <PaginationItem key={item}>
                  <PaginationLink
                    href="#"
                    isActive={item === currentPage}
                    onClick={(event) => {
                      event.preventDefault();
                      setPage(item);
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
                  aria-disabled={currentPage >= pageCount}
                  tabIndex={currentPage >= pageCount ? -1 : 0}
                  className={currentPage >= pageCount ? "pointer-events-none opacity-50" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    setPage(Math.min(pageCount, currentPage + 1));
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </>
  );
}

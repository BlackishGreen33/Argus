"use client";

import { Filter, Pencil, Plus, RotateCw, Search, X } from "lucide-react";
import React, { useMemo, useState } from "react";

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
import { COMPONENT_PAGE_SIZE } from "@/constants/app";
import { useI18n } from "@/i18n";
import type { ComponentRecord } from "@/types/domain";
import { formatDate } from "@/utils/format";

interface ComponentsPageProps {
  components: ComponentRecord[];
  query: string;
  setQuery: (value: string) => void;
  loading: boolean;
  authPending: boolean;
  isAdmin: boolean;
  onLogin: () => void;
  onRefresh: () => void;
  onEdit: (component: ComponentRecord) => void;
  onCreate: () => void;
}

export const ComponentsPage: React.FC<ComponentsPageProps> = ({
  components,
  query,
  setQuery,
  loading,
  authPending,
  isAdmin,
  onLogin,
  onRefresh,
  onEdit,
  onCreate,
}) => {
  const { locale, t } = useI18n();
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
  const pageCount = Math.max(1, Math.ceil(visibleComponents.length / COMPONENT_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = visibleComponents.slice((currentPage - 1) * COMPONENT_PAGE_SIZE, currentPage * COMPONENT_PAGE_SIZE);

  return (
    <>
      <div className="page-heading">
        <div>
          <h1 className="display-title">{t("page.components.title")}</h1>
          <p>{t("page.components.subtitle")}</p>
        </div>
        <Button onClick={isAdmin ? onCreate : onLogin} disabled={authPending}>
          <Plus size={16} /> {authPending ? t("components.verifyLogin") : t("components.create")}
        </Button>
      </div>
      <div className="filter-row">
        <div className="local-search">
          <Search size={17} aria-hidden="true" />
          <Input
            name="component-search"
            autoComplete="off"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder={t("search.local.component.placeholder")}
            aria-label={t("search.local.component.label")}
          />
          {query && (
            <button
              type="button"
              className="input-clear"
              aria-label={t("search.clear.component")}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setQuery("");
                setPage(1);
              }}
            >
              <X size={15} aria-hidden="true" />
            </button>
          )}
        </div>
        <Button variant="outline" onClick={onRefresh}>
          <RotateCw size={15} /> {t("action.refresh")}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" aria-label={t("components.filterType")}>
              <Filter size={15} />{" "}
              {typeFilter ? t("components.typeFilter", { type: typeFilter }) : t("components.type")}
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
              <DropdownMenuRadioItem value="all">{t("components.allTypes")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="maven">{t("components.type.maven")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="npm">{t("components.type.npm")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="pypi">{t("components.type.pypi")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="golang">{t("components.type.golang")}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="table-shell">
        <Table className="components-table argus-table">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[31%]">{t("components.purl")}</TableHead>
              <TableHead className="w-24">{t("components.type")}</TableHead>
              <TableHead>{t("components.name")}</TableHead>
              <TableHead className="w-32">{t("components.version")}</TableHead>
              <TableHead className="w-32">{t("components.recordTime")}</TableHead>
              <TableHead className="w-16">{t("components.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="empty-state">{t("components.loading")}</div>
                </TableCell>
              </TableRow>
            )}
            {!loading && !pageItems.length && (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="empty-state">{t("components.empty")}</div>
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
                  <TableCell className="component-purl-cell">
                    <div className="cell-title">
                      <strong title={component.purl} translate="no">
                        {component.purl}
                      </strong>
                      <span title={component.cpe ?? t("components.cpeMissing")}>
                        {component.cpe ?? t("components.cpeMissing")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {component.type
                      ? t(`components.type.${component.type.toLowerCase()}`)
                      : t("components.type.unknown")}
                  </TableCell>
                  <TableCell
                    className="component-name-cell truncate"
                    title={`${component.vendor ? `${component.vendor} / ` : ""}${component.name}`}
                  >
                    <span translate="no">
                      {component.vendor ? `${component.vendor} / ` : ""}
                      {component.name}
                    </span>
                  </TableCell>
                  <TableCell>{component.version}</TableCell>
                  <TableCell className="cell-muted">
                    {formatDate(component.recordTime, locale, t("triage.noValue"))}
                  </TableCell>
                  <TableCell className="w-12" onClick={(event) => event.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("components.editAria", { name: component.name })}
                      title={t("action.editComponent")}
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
        <span>{t("components.total", { count: visibleComponents.length })}</span>
        <div className="pagination-tools">
          <span className="cell-muted">{t("components.purlLocked")}</span>
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
};

"use client";

import { ArrowUpRight, Check, Clock3, Lock, LogIn, Pencil } from "lucide-react";
import type React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/ui/delete-button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CveRecord, TriageStatus } from "@/types/domain";
import type { DrawerTab } from "@/types/ui";
import { formatDate } from "@/utils/format";
import { severityLabels, statusLabels } from "@/utils/labels";

interface CveDrawerProps {
  cve: CveRecord;
  tab: DrawerTab;
  setTab: (tab: DrawerTab) => void;
  isAdmin: boolean;
  onLogin: () => void;
  onClose: () => void;
  onStatus: (cveId: string, status: TriageStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
  onCandidate: (id: string, status: "CONFIRMED" | "REJECTED") => void;
}

interface DetailFieldProps {
  label: string;
  value: string;
  locked?: boolean;
}

export const CveDrawer: React.FC<CveDrawerProps> = ({
  cve,
  tab,
  setTab,
  isAdmin,
  onLogin,
  onClose,
  onStatus,
  onEdit,
  onDelete,
  onCandidate,
}) => {
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="argus-drawer-sheet w-[min(430px,100vw)] p-0"
        aria-label={`${cve.cveId} 漏洞详情`}
        aria-describedby="cve-drawer-description"
      >
        <SheetHeader className="border-border border-b px-5 py-5 pr-14 text-left">
          <div className="drawer-cve">{cve.cveId}</div>
          <Badge variant="secondary" className="severity-badge w-fit">
            <i className={`severity-dot ${cve.severity}`} />
            {severityLabels[cve.severity ?? ""] ?? cve.severity}
          </Badge>
          <SheetTitle className="serif text-2xl leading-tight font-normal">{cve.title ?? "未命名漏洞"}</SheetTitle>
          <SheetDescription id="cve-drawer-description" className="sr-only">
            {cve.cveId} 漏洞详情，包含摘要、影响组件和处理历史。
          </SheetDescription>
        </SheetHeader>

        <Tabs
          className="drawer-tabs"
          value={tab}
          onValueChange={(value) => setTab(value as DrawerTab)}
          aria-label="漏洞详情分区"
        >
          <TabsList variant="line" className="drawer-tabs-list">
            {(["Overview", "Impact", "History"] as DrawerTab[]).map((item) => (
              <TabsTrigger key={item} value={item} className="drawer-tab">
                {item}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="drawer-scroll">
          {tab === "Overview" && (
            <>
              <div className="section-label">摘要</div>
              <p className="summary">{cve.description ?? "暂无描述"}</p>
              <div className="section-label">本地处理状态</div>
              <div className="status-control">
                {(Object.keys(statusLabels) as TriageStatus[]).map((status) => (
                  <Button
                    key={status}
                    variant={cve.triageStatus === status ? "default" : "outline"}
                    size="sm"
                    className={`status-choice${cve.triageStatus === status ? "active" : ""}`}
                    aria-pressed={cve.triageStatus === status}
                    onClick={() => (isAdmin ? onStatus(cve.cveId, status) : onLogin())}
                  >
                    {statusLabels[status]}
                  </Button>
                ))}
              </div>
              <div className="score">
                <div className="score-top">
                  <div>
                    <div className="section-label">评分详情</div>
                    <div className="score-number">{cve.cvssScoreV3 ?? cve.cvssScoreV4 ?? "—"}</div>
                  </div>
                  <span className="cell-muted whitespace-nowrap">CVSS v3.1</span>
                </div>
                <div className="score-track">
                  <span style={{ width: `${Math.min((cve.cvssScoreV3 ?? cve.cvssScoreV4 ?? 0) * 10, 100)}%` }} />
                </div>
              </div>
              <DetailField label="受影响版本" value={cve.affectedVersions.join(", ") || "未提供"} />
              <DetailField label="来源" value={cve.sourceName ?? "NVD"} locked />
            </>
          )}
          {tab === "Impact" && (
            <>
              <div className="section-label">受影响组件</div>
              <div className="related-list">
                {cve.candidates.map((candidate) => (
                  <div className="related-item" key={candidate.id}>
                    <div className="related-top">
                      <span className="related-name">
                        <strong className="block truncate" title={candidate.componentName}>
                          {candidate.componentName}
                        </strong>
                        <span className="cell-muted block break-all">{candidate.componentPurl}</span>
                      </span>
                      <Badge variant="outline" className={`candidate-tag ${candidate.status}`}>
                        {candidate.status === "CANDIDATE"
                          ? "候选"
                          : candidate.status === "CONFIRMED"
                            ? "已确认"
                            : "已排除"}
                      </Badge>
                    </div>
                    <span className="confidence">
                      {candidate.matchReason} · 置信度 {Math.round((candidate.confidence ?? 0) * 100)}%
                    </span>
                    {candidate.status === "CANDIDATE" && (
                      <div className="candidate-actions">
                        {isAdmin ? (
                          <>
                            <Button size="sm" variant="outline" onClick={() => onCandidate(candidate.id, "CONFIRMED")}>
                              <Check size={13} /> 确认
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => onCandidate(candidate.id, "REJECTED")}>
                              排除
                            </Button>
                          </>
                        ) : (
                          <span className="cell-muted">登录后确认候选关系</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {!cve.candidates.length && <div className="empty-state">暂无候选关联</div>}
            </>
          )}
          {tab === "History" && (
            <div className="audit-list">
              {cve.history.length ? (
                cve.history.map((event) => (
                  <div className="audit-item" key={event.id}>
                    <div className="min-w-0">
                      <strong className="block">
                        {event.action === "STATUS_CHANGED"
                          ? `状态改为「${statusLabels[String(event.metadata?.status) as TriageStatus] ?? String(event.metadata?.status ?? "未知")}」`
                          : event.action === "CVE_UPDATED"
                            ? "更新了漏洞内容"
                            : event.action}
                      </strong>
                      <span>{event.actorEmail ?? "Admin"}</span>
                    </div>
                    <span className="audit-date">
                      <Clock3 size={13} /> {formatDate(event.createdAt)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="empty-state">暂无状态历史</div>
              )}
            </div>
          )}
        </div>

        <Separator />
        <SheetFooter className="drawer-actions px-5 py-4 sm:flex-row">
          {isAdmin ? (
            <>
              <Button className="flex-1" onClick={onEdit}>
                <Pencil size={15} /> 编辑记录
              </Button>
              <DeleteButton
                className="cve-delete-button"
                label="删除漏洞"
                confirmLabel="确认删除漏洞"
                cancelLabel="取消删除"
                deletedMessage="漏洞已删除"
                keptMessage="已取消删除"
                onConfirm={onDelete}
              />
            </>
          ) : (
            <Button className="flex-1" onClick={onLogin}>
              <LogIn size={15} /> 登录后编辑
            </Button>
          )}
          <Button variant="outline" asChild>
            <a href={cve.sourceLink ?? "#"} target="_blank" rel="noreferrer">
              <ArrowUpRight size={15} /> 来源
            </a>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

const DetailField: React.FC<DetailFieldProps> = ({ label, value, locked }) => {
  return (
    <div className="field detail-field">
      <label className="flex items-center gap-1 whitespace-nowrap">
        {label} {locked && <Lock size={12} />}
      </label>
      <div className="detail-value">
        <span className="min-w-0 break-words">{value}</span>
        {locked && <Lock size={13} className="shrink-0" />}
      </div>
    </div>
  );
};

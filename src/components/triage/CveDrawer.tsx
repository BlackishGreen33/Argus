"use client";

import { ArrowUpRight, Check, Clock3, Lock, LogIn, Pencil } from "lucide-react";
import type React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/ui/delete-button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/i18n";
import type { CveRecord, TriageStatus } from "@/types/domain";
import type { DrawerTab } from "@/types/ui";
import { formatDate } from "@/utils/format";
import { severityLabelKeys, statusLabelKeys } from "@/utils/labels";

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
  const { locale, t } = useI18n();
  const tabs: Array<{ value: DrawerTab; key: string }> = [
    { value: "Overview", key: "triage.tab.overview" },
    { value: "Impact", key: "triage.tab.impact" },
    { value: "History", key: "triage.tab.history" },
  ];
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="argus-drawer-sheet w-[min(430px,100%)] p-0"
        aria-label={t("triage.cveDetails", { id: cve.cveId })}
        aria-describedby="cve-drawer-description"
      >
        <SheetHeader className="border-border border-b px-5 py-5 pr-14 text-left">
          <div className="drawer-cve">{cve.cveId}</div>
          <Badge variant="secondary" className="severity-badge w-fit">
            <i className={`severity-dot ${cve.severity}`} />
            {t(severityLabelKeys[cve.severity ?? ""] ?? "triage.noValue")}
          </Badge>
          <SheetTitle className="display-title text-2xl leading-tight font-normal">
            {cve.title ?? t("triage.unnamed")}
          </SheetTitle>
          <SheetDescription id="cve-drawer-description" className="sr-only">
            {t("triage.cveDetails", { id: cve.cveId })}
          </SheetDescription>
        </SheetHeader>

        <Tabs
          className="drawer-tabs"
          value={tab}
          onValueChange={(value) => setTab(value as DrawerTab)}
          aria-label={t("triage.detailsTabs")}
        >
          <TabsList variant="line" className="drawer-tabs-list">
            {tabs.map((item) => (
              <TabsTrigger key={item.value} value={item.value} className="drawer-tab">
                {t(item.key)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="drawer-scroll">
          {tab === "Overview" && (
            <>
              <div className="section-label">{t("triage.summary")}</div>
              <p className="summary">{cve.description ?? t("triage.summaryMissing")}</p>
              <div className="section-label">{t("triage.localStatus")}</div>
              <div className="status-control">
                {(Object.keys(statusLabelKeys) as TriageStatus[]).map((status) => (
                  <Button
                    key={status}
                    variant={cve.triageStatus === status ? "default" : "outline"}
                    size="sm"
                    className={`status-choice${cve.triageStatus === status ? "active" : ""}`}
                    aria-pressed={cve.triageStatus === status}
                    onClick={() => (isAdmin ? onStatus(cve.cveId, status) : onLogin())}
                  >
                    {t(statusLabelKeys[status])}
                  </Button>
                ))}
              </div>
              <div className="score">
                <div className="score-top">
                  <div>
                    <div className="section-label">{t("triage.scoreDetails")}</div>
                    <div className="score-number">{cve.cvssScoreV3 ?? cve.cvssScoreV4 ?? t("triage.noValue")}</div>
                  </div>
                  <span className="cell-muted whitespace-nowrap">{t("triage.cvssVersion")}</span>
                </div>
                <div className="score-track">
                  <span style={{ width: `${Math.min((cve.cvssScoreV3 ?? cve.cvssScoreV4 ?? 0) * 10, 100)}%` }} />
                </div>
              </div>
              <DetailField
                label={t("triage.versionsLabel")}
                value={cve.affectedVersions.join(", ") || t("triage.notProvided")}
              />
              <DetailField
                label={t("triage.detailSource")}
                value={cve.sourceName ?? t("triage.sourceUnknown")}
                locked
              />
            </>
          )}
          {tab === "Impact" && (
            <>
              <div className="section-label">{t("triage.affectedComponents")}</div>
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
                          ? t("triage.candidate")
                          : candidate.status === "CONFIRMED"
                            ? t("triage.candidateConfirmedLabel")
                            : t("triage.candidateRejectedLabel")}
                      </Badge>
                    </div>
                    <span className="confidence">
                      {t(candidate.matchReason)} {t("triage.historySeparator")}{" "}
                      {t("triage.confidence", { percent: Math.round((candidate.confidence ?? 0) * 100) })}
                    </span>
                    {candidate.status === "CANDIDATE" && (
                      <div className="candidate-actions">
                        {isAdmin ? (
                          <>
                            <Button size="sm" variant="outline" onClick={() => onCandidate(candidate.id, "CONFIRMED")}>
                              <Check size={13} /> {t("action.confirm")}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => onCandidate(candidate.id, "REJECTED")}>
                              {t("action.reject")}
                            </Button>
                          </>
                        ) : (
                          <span className="cell-muted">{t("triage.loginCandidate")}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {!cve.candidates.length && <div className="empty-state">{t("triage.noCandidates")}</div>}
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
                          ? t("triage.historyStatusChanged", {
                              status: t(
                                statusLabelKeys[String(event.metadata?.status) as TriageStatus] ??
                                  "triage.historyUnknown",
                              ),
                            })
                          : event.action === "CVE_UPDATED"
                            ? t("triage.historyUpdated")
                            : event.action}
                      </strong>
                      <span>{event.actorEmail ?? t("triage.historyAdmin")}</span>
                    </div>
                    <span className="audit-date">
                      <Clock3 size={13} /> {formatDate(event.createdAt, locale, t("triage.noValue"))}
                    </span>
                  </div>
                ))
              ) : (
                <div className="empty-state">{t("triage.noHistory")}</div>
              )}
            </div>
          )}
        </div>

        <Separator />
        <SheetFooter className="drawer-actions px-5 py-4 sm:flex-row">
          {isAdmin ? (
            <>
              <Button className="flex-1" onClick={onEdit}>
                <Pencil size={15} /> {t("triage.editRecord")}
              </Button>
              <DeleteButton
                className="cve-delete-button"
                label={t("triage.deleteVulnerability")}
                confirmLabel={t("triage.confirmDeleteVulnerability")}
                cancelLabel={t("triage.cancelDelete")}
                deletedMessage={t("triage.deletedVulnerability")}
                keptMessage={t("triage.cancelDelete")}
                onConfirm={onDelete}
              />
            </>
          ) : (
            <Button className="flex-1" onClick={onLogin}>
              <LogIn size={15} /> {t("action.loginAfter")}
            </Button>
          )}
          <Button variant="outline" asChild>
            <a href={cve.sourceLink ?? "#"} target="_blank" rel="noreferrer">
              <ArrowUpRight size={15} /> {t("action.source")}
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

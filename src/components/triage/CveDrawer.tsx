"use client";

import { ArrowUpRight, Check, Clock3, Lock, LogIn, Pencil } from "lucide-react";
import type React from "react";

import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { DeleteButton } from "@/components/ui/delete-button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CVSS_MAX_SCORE } from "@/constants/app";
import { useI18n } from "@/i18n";
import type { CveRecord, TriageStatus } from "@/types/domain";
import type { DrawerTab } from "@/types/ui";
import { formatDate } from "@/utils/format";
import { severityLabelKeys, statusLabelKeys } from "@/utils/labels";

interface CveDrawerProps {
  open: boolean;
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
  open,
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
  const score = cve.cvssScoreV3 ?? cve.cvssScoreV4;
  const tabs: Array<{ value: DrawerTab; key: string }> = [
    { value: "Overview", key: "triage.tab.overview" },
    { value: "Impact", key: "triage.tab.impact" },
    { value: "History", key: "triage.tab.history" },
  ];
  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <SheetContent
        side="right"
        className="argus-drawer-sheet w-[min(430px,100%)] p-0"
        aria-describedby="cve-drawer-description"
      >
        <SheetHeader className="border-border border-b px-5 py-5 pr-14 text-left">
          <div className="drawer-id-row">
            <div className="drawer-cve" translate="no">
              {cve.cveId}
            </div>
            <CopyButton key={cve.cveId} value={cve.cveId} />
          </div>
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

        <Tabs className="drawer-tabs" value={tab} onValueChange={(value) => setTab(value as DrawerTab)}>
          <TabsList className="drawer-tabs-list" aria-label={t("triage.detailsTabs")}>
            {tabs.map((item) => (
              <TabsTrigger key={item.value} value={item.value} className="drawer-tab">
                {t(item.key)}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="drawer-scroll">
            <TabsContent value="Overview">
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
              <div className={`score severity-${cve.severity?.toLowerCase() ?? "low"}`}>
                <div className="score-top">
                  <div>
                    <div className="section-label">{t("triage.scoreDetails")}</div>
                    <span className="cell-muted whitespace-nowrap">{t("triage.cvssVersion")}</span>
                  </div>
                  <AnimatedCircularProgressBar
                    className="cvss cvss-detail"
                    max={CVSS_MAX_SCORE}
                    value={score}
                    gaugePrimaryColor="var(--cvss-color)"
                    gaugeSecondaryColor="var(--ui-cvss-track)"
                    emptyValue={t("triage.noValue")}
                    aria-label={t("triage.cvssValue", { value: score ?? t("triage.noValue") })}
                  />
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
            </TabsContent>
            <TabsContent value="Impact">
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
            </TabsContent>
            <TabsContent value="History">
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
            </TabsContent>
          </div>
        </Tabs>

        <Separator />
        <SheetFooter className="drawer-actions px-5 py-4 sm:flex-row">
          {isAdmin ? (
            <>
              <div className="drawer-delete-action">
                <DeleteButton
                  className="cve-delete-button"
                  label={t("triage.deleteVulnerability")}
                  confirmLabel={t("triage.confirmDeleteVulnerability")}
                  cancelLabel={t("triage.cancelDelete")}
                  deletedMessage={t("triage.deletedVulnerability")}
                  keptMessage={t("triage.cancelDelete")}
                  onConfirm={onDelete}
                />
                <span>{t("triage.deleteVulnerability")}</span>
              </div>
              <Button className="drawer-primary-action flex-1" onClick={onEdit}>
                <Pencil size={16} /> {t("triage.editRecord")}
              </Button>
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

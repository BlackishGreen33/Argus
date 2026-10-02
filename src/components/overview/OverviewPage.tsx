"use client";

import { Activity, Check, RotateCw } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import { request } from "@/client/http";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import type { ImportJob, OverviewData } from "@/types/domain";
import { importStatusLabelKeys, severityLabelKeys } from "@/utils/labels";

interface OverviewPageProps {
  data: OverviewData | null;
  loading: boolean;
  authPending: boolean;
  isAdmin: boolean;
  onLogin: () => void;
  onToast: (message: string) => void;
  onRefresh: () => Promise<void>;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  data,
  loading,
  authPending,
  isAdmin,
  onLogin,
  onToast,
  onRefresh,
}) => {
  const { t } = useI18n();
  const [job, setJob] = useState<ImportJob | null>(data?.latestImport ?? null);
  const [working, setWorking] = useState(false);
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    setJob(data?.latestImport ?? null);
  }, [data?.latestImport]);
  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    },
    [],
  );
  const startImport = async () => {
    if (authPending) return;
    if (!isAdmin) return onLogin();
    setWorking(true);
    try {
      const response = await request<{ data: ImportJob }>("/api/imports", { method: "POST" });
      setJob(response.data);
      onToast(t("overview.refreshQueued"));
      timerRef.current = window.setInterval(async () => {
        try {
          const next = await request<{ data: ImportJob }>(`/api/imports/${response.data.id}`);
          setJob(next.data);
          if (["PREVIEW_READY", "FAILED", "SUCCEEDED"].includes(next.data.status)) {
            if (timerRef.current !== null) window.clearInterval(timerRef.current);
            timerRef.current = null;
            setWorking(false);
            await onRefresh();
          }
        } catch (error) {
          if (timerRef.current !== null) window.clearInterval(timerRef.current);
          timerRef.current = null;
          setWorking(false);
          onToast(error instanceof Error ? error.message : t("overview.refreshStatusFailed"));
        }
      }, 1000);
    } catch (error) {
      setWorking(false);
      onToast(error instanceof Error ? error.message : t("overview.importStartFailed"));
    }
  };
  const merge = async () => {
    if (authPending) return;
    if (!job || !isAdmin) return onLogin();
    try {
      const response = await request<{ data: ImportJob }>(`/api/imports/${job.id}/merge`, { method: "POST" });
      setJob(response.data);
      onToast(t("overview.mergePreview"));
      await onRefresh();
    } catch (error) {
      onToast(error instanceof Error ? error.message : t("overview.mergeFailed"));
    }
  };
  const retry = async () => {
    if (authPending) return;
    if (!job || !isAdmin) return onLogin();
    try {
      const response = await request<{ data: ImportJob }>(`/api/imports/${job.id}/retry`, { method: "POST" });
      setJob(response.data);
      onToast(t("overview.requeued"));
    } catch (error) {
      onToast(error instanceof Error ? error.message : t("overview.retryFailed"));
    }
  };
  const severityMax = Math.max(...(data?.severity.map((item) => item.count) ?? [1]), 1);
  const ecosystemMax = Math.max(...(data?.ecosystems.map((item) => item.count) ?? [1]), 1);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1 className="display-title">{t("page.overview.title")}</h1>
          <p>{t("page.overview.subtitle")}</p>
        </div>
        <Button onClick={startImport} disabled={working || authPending}>
          {working ? <RotateCw size={15} className="spin" /> : <RotateCw size={15} />}{" "}
          {authPending ? t("components.verifyLogin") : working ? t("overview.refreshing") : t("overview.refreshData")}
        </Button>
      </div>
      {loading && !data ? (
        <div className="empty-state">{t("overview.loading")}</div>
      ) : (
        <>
          <div className="dashboard-grid">
            <Metric
              label={t("overview.metric.openCritical")}
              value={data?.openCritical ?? 0}
              note={t("overview.metric.openCriticalNote")}
            />
            <Metric
              label={t("overview.metric.openHigh")}
              value={data?.openHigh ?? 0}
              note={t("overview.metric.openHighNote")}
            />
            <Metric
              label={t("overview.metric.riskIndex")}
              value={`${data?.riskIndex ?? 0}`}
              note={t("overview.metric.riskIndexNote")}
            />
            <Metric
              label={t("overview.metric.candidates")}
              value={data?.ecosystems.reduce((sum, item) => sum + item.count, 0) ?? 0}
              note={t("overview.metric.candidatesNote")}
            />
          </div>
          <div className="overview-grid">
            <section className="panel">
              <h3>{t("overview.severityDistribution")}</h3>
              <div className="bars">
                {data?.severity.map((item) => (
                  <div className="bar-row" key={item.name}>
                    <span>{t(severityLabelKeys[item.name] ?? item.name)}</span>
                    <div className="bar-track">
                      <div
                        className={`bar-fill ${item.name.toLowerCase()}`}
                        style={{ width: `${(item.count / severityMax) * 100}%` }}
                      />
                    </div>
                    <strong>{item.count}</strong>
                  </div>
                ))}
              </div>
            </section>
            <section className="panel">
              <h3>{t("overview.ecosystems")}</h3>
              <div className="bars">
                {data?.ecosystems.length ? (
                  data.ecosystems.map((item) => (
                    <div className="bar-row" key={item.name}>
                      <span>{item.name}</span>
                      <div className="bar-track">
                        <div
                          className="bar-fill ecosystem"
                          style={{ width: `${(item.count / ecosystemMax) * 100}%` }}
                        />
                      </div>
                      <strong>{item.count}</strong>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">{t("overview.noEcosystems")}</div>
                )}
              </div>
            </section>
            <section className="import-panel">
              <div className="import-top">
                <div>
                  <div className="section-label">{t("overview.importFlow")}</div>
                  <h3>{t("overview.refresh")}</h3>
                  <div className="import-status">
                    <Activity size={14} /> {t("overview.status")}
                    <strong>{job ? t(importStatusLabelKeys[job.status]) : t("overview.notRun")}</strong>
                    {job?.retryCount ? ` ${t("triage.historySeparator")} ${job.retryCount}` : ""}
                  </div>
                </div>
                <Button variant="outline" onClick={startImport} disabled={working || authPending}>
                  <RotateCw size={14} /> {t("overview.preview")}
                </Button>
              </div>
              {job?.summary && (
                <div className="diff-list">
                  <div className="diff-item">{t("overview.cvesParsed", { count: job.summary.cves })}</div>
                  <div className="diff-item">{t("overview.componentsParsed", { count: job.summary.components })}</div>
                  {job.sampleDiffs?.map((diff) => (
                    <div className="diff-item" key={`${diff.entity}-${diff.key}`}>
                      <strong>
                        {diff.entity} {t("triage.historySeparator")} {diff.key}
                      </strong>
                      {diff.change}
                    </div>
                  ))}
                </div>
              )}
              {job?.status === "PREVIEW_READY" && isAdmin && (
                <div className="import-actions">
                  <Button onClick={merge}>
                    <Check size={15} /> {t("overview.merge")}
                  </Button>
                  <Button variant="outline" onClick={() => onToast(t("overview.sample"))}>
                    {t("overview.viewDiff")}
                  </Button>
                </div>
              )}
              {job?.status === "FAILED" && (
                <div className="import-error">
                  <span className="cell-muted">{job.errorMessage ?? t("overview.importFailed")}</span>
                  <Button variant="outline" size="sm" onClick={retry} disabled={authPending}>
                    {t("overview.retry")}
                  </Button>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
};

interface MetricProps {
  label: string;
  value: string | number;
  note: string;
}

const Metric: React.FC<MetricProps> = ({ label, value, note }) => {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-note">{note}</div>
    </div>
  );
};

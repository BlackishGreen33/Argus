"use client";

import { Accordion } from "@animate-ui/react/primitives/radix-ui";
import { ArrowRight, Check, ChevronDown, LoaderCircle, RefreshCw, TriangleAlert } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { request } from "@/client/http";
import { Button } from "@/components/ui/button";
import { NumberTicker } from "@/components/ui/number-ticker";
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
  const { locale, t } = useI18n();
  const [job, setJob] = useState<ImportJob | null>(data?.latestImport ?? null);
  const [merging, setMerging] = useState(false);
  const [refreshState, setRefreshState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const working =
    refreshState !== "error" &&
    (refreshState === "loading" || merging || Boolean(job && ["QUEUED", "RUNNING", "MERGING"].includes(job.status)));
  const busyRef = useRef(false);
  const activeRef = useRef(true);
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    setJob(data?.latestImport ?? null);
  }, [data?.latestImport]);
  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      busyRef.current = false;
    };
  }, []);
  const watchJob = useCallback(
    async function watch(next: ImportJob): Promise<void> {
      if (!activeRef.current) return;
      setJob(next);
      if (["PREVIEW_READY", "FAILED", "SUCCEEDED"].includes(next.status)) {
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        timerRef.current = null;
        busyRef.current = false;
        setRefreshState(next.status === "FAILED" ? "error" : "success");
        if (next.status === "FAILED") onToast(next.errorMessage ?? t("overview.importFailed"));
        if (next.status === "SUCCEEDED") onToast(t("overview.mergePreview"));
        await onRefresh();
      } else if (timerRef.current === null) {
        timerRef.current = window.setTimeout(async () => {
          timerRef.current = null;
          try {
            const response = await request<{ data: ImportJob }>(`/api/imports/${next.id}`);
            await watch(response.data);
          } catch (error) {
            if (!activeRef.current) return;
            if (timerRef.current !== null) window.clearTimeout(timerRef.current);
            timerRef.current = null;
            busyRef.current = false;
            setRefreshState("error");
            onToast(error instanceof Error ? error.message : t("overview.refreshStatusFailed"));
          }
        }, 1000);
      }
    },
    [onRefresh, onToast, t],
  );
  useEffect(() => {
    if (job && ["QUEUED", "RUNNING", "MERGING"].includes(job.status) && refreshState !== "error" && !busyRef.current) {
      busyRef.current = true;
      setRefreshState("loading");
      void watchJob(job);
    }
  }, [job, refreshState, watchJob]);
  const startImport = async () => {
    if (authPending || working || busyRef.current) return;
    if (!isAdmin) return onLogin();
    busyRef.current = true;
    setRefreshState("loading");
    try {
      const response = await request<{ data: ImportJob }>("/api/imports", { method: "POST" });
      if (!activeRef.current) return;
      if (["QUEUED", "RUNNING"].includes(response.data.status)) onToast(t("overview.refreshQueued"));
      await watchJob(response.data);
    } catch (error) {
      if (!activeRef.current) return;
      busyRef.current = false;
      setRefreshState("error");
      onToast(error instanceof Error ? error.message : t("overview.importStartFailed"));
    }
  };
  const merge = async () => {
    if (authPending || working || busyRef.current) return;
    if (!job || !isAdmin) return onLogin();
    busyRef.current = true;
    setMerging(true);
    setRefreshState("loading");
    try {
      const response = await request<{ data: ImportJob }>(`/api/imports/${job.id}/merge`, { method: "POST" });
      await watchJob(response.data);
    } catch (error) {
      if (!activeRef.current) return;
      busyRef.current = false;
      setRefreshState("error");
      onToast(error instanceof Error ? error.message : t("overview.mergeFailed"));
    } finally {
      if (activeRef.current) setMerging(false);
    }
  };
  const retry = async () => {
    if (authPending || working || busyRef.current) return;
    if (!job || !isAdmin) return onLogin();
    busyRef.current = true;
    setRefreshState("loading");
    try {
      const response = await request<{ data: ImportJob }>(`/api/imports/${job.id}/retry`, { method: "POST" });
      await watchJob(response.data);
    } catch (error) {
      if (!activeRef.current) return;
      busyRef.current = false;
      setRefreshState("error");
      onToast(error instanceof Error ? error.message : t("overview.retryFailed"));
    }
  };
  const severityMax = Math.max(...(data?.severity.map((item) => item.count) ?? [1]), 1);
  const ecosystemMax = Math.max(...(data?.ecosystems.map((item) => item.count) ?? [1]), 1);
  const importStatus = merging ? "MERGING" : job?.status;
  const activeStep =
    importStatus === "SUCCEEDED" ? 3 : importStatus === "MERGING" ? 2 : importStatus === "PREVIEW_READY" ? 1 : 0;
  const importSteps = ["overview.step.parse", "overview.step.review", "overview.step.merge"];
  const StatusIcon =
    importStatus === "FAILED" ? TriangleAlert : importStatus === "SUCCEEDED" ? Check : working ? LoaderCircle : null;
  const refreshFeedback = authPending
    ? t("components.verifyLogin")
    : working
      ? t("overview.refreshing")
      : refreshState === "success"
        ? t(job?.status === "SUCCEEDED" ? "status.succeeded" : "overview.previewReady")
        : refreshState === "error"
          ? t("overview.refreshFailed")
          : null;
  const RefreshIcon = working
    ? LoaderCircle
    : refreshState === "success"
      ? Check
      : refreshState === "error"
        ? TriangleAlert
        : RefreshCw;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1 className="display-title">{t("page.overview.title")}</h1>
          <p>{t("page.overview.subtitle")}</p>
        </div>
        <Button data-state={refreshState} aria-busy={working} onClick={startImport} disabled={authPending || working}>
          <RefreshIcon size={16} className={working ? "spin" : undefined} aria-hidden="true" />
          {refreshFeedback ?? t("overview.refreshData")}
        </Button>
      </div>
      <span className="sr-only" role="status">
        {refreshFeedback}
      </span>
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
              value={data?.riskIndex ?? 0}
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
            <section className="import-panel" aria-labelledby="import-title" data-status={importStatus ?? "IDLE"}>
              <div className="import-top">
                <div className="import-heading">
                  <h3 id="import-title">{t("overview.refresh")}</h3>
                  <div className="import-status" role="status">
                    {StatusIcon && <StatusIcon size={14} className={working ? "spin" : undefined} aria-hidden="true" />}
                    {importStatus ? t(importStatusLabelKeys[importStatus]) : t("overview.notRun")}
                  </div>
                </div>
                <Button
                  data-state={refreshState}
                  aria-busy={working}
                  aria-label={t("overview.preview")}
                  variant="outline"
                  onClick={startImport}
                  disabled={authPending || working}
                >
                  <RefreshIcon size={16} className={working ? "spin" : undefined} aria-hidden="true" />
                  <span className="import-preview-label">{t("overview.preview")}</span>
                </Button>
              </div>
              <ol className="import-steps" aria-label={t("overview.importFlow")}>
                {importSteps.map((label, index) => {
                  const state =
                    importStatus === "FAILED"
                      ? "pending"
                      : index < activeStep
                        ? "complete"
                        : importStatus && index === activeStep
                          ? "current"
                          : "pending";
                  return (
                    <li
                      key={label}
                      className="import-step"
                      data-state={state}
                      aria-current={state === "current" ? "step" : undefined}
                    >
                      <span className="import-step-marker" aria-hidden="true">
                        {state === "complete" ? <Check size={14} /> : index + 1}
                      </span>
                      <span>{t(label)}</span>
                    </li>
                  );
                })}
              </ol>
              {job?.summary ? (
                <div className="import-summary">
                  <dl className="import-totals">
                    {(["cves", "components"] as const).map((entity) => (
                      <div key={entity}>
                        <dt>{t(`overview.source.${entity}`)}</dt>
                        <dd className="import-count">
                          {new Intl.NumberFormat(locale).format(job.summary?.[entity] ?? 0)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {(importStatus === "PREVIEW_READY" || importStatus === "MERGING") && (
                    <div className="import-next">
                      <p>
                        {t(
                          authPending
                            ? "components.verifyLogin"
                            : isAdmin
                              ? "overview.reviewHint"
                              : "overview.guestReviewHint",
                        )}
                      </p>
                      {isAdmin && (
                        <Button onClick={merge} disabled={authPending || working} aria-busy={working}>
                          {importStatus === "MERGING" ? (
                            <LoaderCircle size={16} className="spin" aria-hidden="true" />
                          ) : (
                            <ArrowRight size={16} aria-hidden="true" />
                          )}
                          {t(importStatus === "MERGING" ? "status.merging" : "overview.merge")}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="import-empty">{t(working ? "overview.parsingHint" : "overview.startHint")}</p>
              )}
              {Boolean(job?.sampleDiffs?.length) && (
                <Accordion.Root key={job?.id} type="single" collapsible className="import-samples">
                  <Accordion.Item value="samples">
                    <Accordion.Header>
                      <Accordion.Trigger className="import-samples-trigger">
                        <span>
                          {t("overview.viewSamples")}{" "}
                          <span className="import-sample-count">{job?.sampleDiffs?.length}</span>
                        </span>
                        <ChevronDown size={16} aria-hidden="true" />
                      </Accordion.Trigger>
                    </Accordion.Header>
                    <Accordion.Content>
                      <ul className="import-sample-list">
                        {job?.sampleDiffs?.map((diff) => (
                          <li key={`${diff.entity}-${diff.key}`}>
                            <span className="import-sample-entity">{diff.entity}</span>
                            <div>
                              <strong>{diff.key}</strong>
                              <span>{diff.change}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </Accordion.Content>
                  </Accordion.Item>
                </Accordion.Root>
              )}
              {job?.status === "FAILED" && (
                <div className="import-error" role="alert">
                  <TriangleAlert size={16} aria-hidden="true" />
                  <span>{job.errorMessage ?? t("overview.importFailed")}</span>
                  <Button variant="outline" size="sm" onClick={retry} disabled={working || authPending}>
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
  value: number;
  note: string;
}

const Metric: React.FC<MetricProps> = ({ label, value, note }) => {
  const { locale } = useI18n();
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value">
        <NumberTicker value={value} locale={locale} />
      </div>
      <div className="metric-note">{note}</div>
    </div>
  );
};

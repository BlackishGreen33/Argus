"use client";

import { Activity, Check, RotateCw } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { ImportJob, OverviewData } from "@/types/domain";
import { request } from "@/utils/http";
import { importStatusLabel, severityLabels } from "@/utils/labels";

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
      onToast("数据刷新已进入队列");
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
          onToast(error instanceof Error ? error.message : "刷新状态失败");
        }
      }, 1000);
    } catch (error) {
      setWorking(false);
      onToast(error instanceof Error ? error.message : "启动导入失败");
    }
  };
  const merge = async () => {
    if (authPending) return;
    if (!job || !isAdmin) return onLogin();
    try {
      const response = await request<{ data: ImportJob }>(`/api/imports/${job.id}/merge`, { method: "POST" });
      setJob(response.data);
      onToast("预览已合并到正式数据");
      await onRefresh();
    } catch (error) {
      onToast(error instanceof Error ? error.message : "合并失败");
    }
  };
  const retry = async () => {
    if (authPending) return;
    if (!job || !isAdmin) return onLogin();
    try {
      const response = await request<{ data: ImportJob }>(`/api/imports/${job.id}/retry`, { method: "POST" });
      setJob(response.data);
      onToast("已重新排队");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "重试失败");
    }
  };
  const severityMax = Math.max(...(data?.severity.map((item) => item.count) ?? [1]), 1);
  const ecosystemMax = Math.max(...(data?.ecosystems.map((item) => item.count) ?? [1]), 1);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">安全态势</div>
          <h1 className="serif">Overview</h1>
          <p>让风险状态保持可见、可解释、可复现。</p>
        </div>
        <Button onClick={startImport} disabled={working || authPending}>
          {working ? <RotateCw size={15} className="spin" /> : <RotateCw size={15} />}{" "}
          {authPending ? "验证登录状态…" : working ? "刷新中…" : "刷新内建数据"}
        </Button>
      </div>
      {loading && !data ? (
        <div className="empty-state">正在计算风险状态…</div>
      ) : (
        <>
          <div className="dashboard-grid">
            <Metric label="未处理 Critical" value={data?.openCritical ?? 0} note="需要优先确认" />
            <Metric label="未处理 High" value={data?.openHigh ?? 0} note="等待分流" />
            <Metric label="Argus Risk Index" value={`${data?.riskIndex ?? 0}`} note="工作台排序指标，不等同 CVSS" />
            <Metric
              label="候选关系"
              value={data?.ecosystems.reduce((sum, item) => sum + item.count, 0) ?? 0}
              note="需要人工确认"
            />
          </div>
          <div className="overview-grid">
            <section className="panel">
              <h3>严重度分布</h3>
              <div className="bars">
                {data?.severity.map((item) => (
                  <div className="bar-row" key={item.name}>
                    <span>{severityLabels[item.name] ?? item.name}</span>
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
              <h3>生态系统</h3>
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
                  <div className="empty-state">暂无生态系统数据</div>
                )}
              </div>
            </section>
            <section className="import-panel">
              <div className="import-top">
                <div>
                  <div className="section-label">导入流程</div>
                  <h3>内建数据刷新</h3>
                  <div className="import-status">
                    <Activity size={14} /> 状态：<strong>{job ? importStatusLabel(job.status) : "尚未运行"}</strong>
                    {job?.retryCount ? ` · 已重试 ${job.retryCount} 次` : ""}
                  </div>
                </div>
                <Button variant="outline" onClick={startImport} disabled={working || authPending}>
                  <RotateCw size={14} /> 重新预览
                </Button>
              </div>
              {job?.summary && (
                <div className="diff-list">
                  <div className="diff-item">
                    <strong>{job.summary.cves} 条 CVE</strong>来源记录已解析
                  </div>
                  <div className="diff-item">
                    <strong>{job.summary.components} 个 Component</strong>可进入合并预览
                  </div>
                  {job.sampleDiffs?.map((diff) => (
                    <div className="diff-item" key={`${diff.entity}-${diff.key}`}>
                      <strong>
                        {diff.entity} · {diff.key}
                      </strong>
                      {diff.change}
                    </div>
                  ))}
                </div>
              )}
              {job?.status === "PREVIEW_READY" && isAdmin && (
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <Button onClick={merge}>
                    <Check size={15} /> 合并更新
                  </Button>
                  <Button variant="outline" onClick={() => onToast("差异样本已在上方展示")}>
                    查看差异
                  </Button>
                </div>
              )}
              {job?.status === "FAILED" && (
                <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="cell-muted">{job.errorMessage ?? "导入失败"}</span>
                  <Button variant="outline" size="sm" onClick={retry} disabled={authPending}>
                    重试
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

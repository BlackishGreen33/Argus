"use client";

import { ArrowUpRight, Check, Clock3, Lock, LogIn, Pencil, Trash2, X } from "lucide-react";

import type { CveRecord, TriageStatus } from "@/types/domain";
import type { DrawerTab } from "@/types/ui";
import { formatDate } from "@/utils/format";
import { severityLabels, statusLabels } from "@/utils/labels";

export function CveDrawer({
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
}: {
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
}) {
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`${cve.cveId} 详情`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="drawer-header">
          <div className="drawer-header-top">
            <div>
              <div className="drawer-cve">{cve.cveId}</div>
              <span className="pill">
                <i className={`severity-dot ${cve.severity}`} />
                {severityLabels[cve.severity ?? ""] ?? cve.severity}
              </span>
              <h2>{cve.title}</h2>
            </div>
            <button className="drawer-close" onClick={onClose} aria-label="关闭详情">
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="tabs">
          {(["Overview", "Impact", "History"] as DrawerTab[]).map((item) => (
            <button key={item} className={`tab ${tab === item ? "active" : ""}`} onClick={() => setTab(item)}>
              {item}
            </button>
          ))}
        </div>
        <div className="drawer-body">
          {tab === "Overview" && (
            <>
              <div className="section-label">摘要</div>
              <p className="summary">{cve.description}</p>
              <div className="section-label">本地处理状态</div>
              <div className="status-control">
                {(Object.keys(statusLabels) as TriageStatus[]).map((status) => (
                  <button
                    key={status}
                    className={`status-choice ${cve.triageStatus === status ? "active" : ""}`}
                    onClick={() => (isAdmin ? onStatus(cve.cveId, status) : onLogin)}
                  >
                    {statusLabels[status]}
                  </button>
                ))}
              </div>
              <div className="score">
                <div className="score-top">
                  <div>
                    <div className="section-label">评分详情</div>
                    <div className="score-number">{cve.cvssScoreV3 ?? cve.cvssScoreV4 ?? "—"}</div>
                  </div>
                  <span className="cell-muted">CVSS v3.1</span>
                </div>
                <div className="score-track">
                  <span style={{ width: `${Math.min((cve.cvssScoreV3 ?? 0) * 10, 100)}%` }} />
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
                        {candidate.componentName}
                        <br />
                        <span className="cell-muted">{candidate.componentPurl}</span>
                      </span>
                      <span className={`candidate-tag ${candidate.status}`}>
                        {candidate.status === "CANDIDATE"
                          ? "候选"
                          : candidate.status === "CONFIRMED"
                            ? "已确认"
                            : "已排除"}
                      </span>
                    </div>
                    <span className="confidence">
                      {candidate.matchReason} · 置信度 {Math.round((candidate.confidence ?? 0) * 100)}%
                    </span>
                    {candidate.status === "CANDIDATE" && (
                      <div className="candidate-actions">
                        {isAdmin ? (
                          <>
                            <button
                              className="secondary-button small-button"
                              onClick={() => onCandidate(candidate.id, "CONFIRMED")}
                            >
                              <Check size={13} /> 确认
                            </button>
                            <button
                              className="secondary-button small-button"
                              onClick={() => onCandidate(candidate.id, "REJECTED")}
                            >
                              排除
                            </button>
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
                    <div>
                      <strong>
                        {event.action === "STATUS_CHANGED"
                          ? `状态改为「${statusLabels[String(event.metadata?.status) as TriageStatus] ?? String(event.metadata?.status ?? "未知")}」`
                          : event.action === "CVE_UPDATED"
                            ? "更新了漏洞内容"
                            : event.action}
                      </strong>
                      <span>{event.actorEmail ?? "Admin"}</span>
                    </div>
                    <span>
                      <Clock3 size={13} /> {formatDate(event.createdAt)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="empty-state">暂无状态历史</div>
              )}
            </div>
          )}
          <div className="drawer-actions">
            {isAdmin ? (
              <>
                <button className="primary-button" onClick={onEdit}>
                  <Pencil size={15} /> 编辑记录
                </button>
                <button className="danger-button" onClick={onDelete} aria-label="删除漏洞">
                  <Trash2 size={15} />
                </button>
              </>
            ) : (
              <button className="primary-button" onClick={onLogin}>
                <LogIn size={15} /> 登录后编辑
              </button>
            )}
            <a className="secondary-button" href={cve.sourceLink ?? "#"} target="_blank" rel="noreferrer">
              <ArrowUpRight size={15} /> 来源
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}

function DetailField({ label, value, locked }: { label: string; value: string; locked?: boolean }) {
  return (
    <div className="field" style={{ marginBottom: 14 }}>
      <label>
        {label} {locked && <Lock size={12} />}
      </label>
      <div className="secondary-button" style={{ justifyContent: "space-between", cursor: "default" }}>
        {value}
        {locked && <Lock size={13} />}
      </div>
    </div>
  );
}

"use client";

import { Activity, Lock, X } from "lucide-react";
import { useState } from "react";

import type { CveRecord } from "@/types/domain";
import { request } from "@/utils/http";
import { severityLabels } from "@/utils/labels";

export function CveEditor({
  cve,
  onClose,
  onSaved,
}: {
  cve: CveRecord;
  onClose: () => void;
  onSaved: (cve: CveRecord) => void;
}) {
  const [form, setForm] = useState({
    title: cve.title ?? "",
    description: cve.description ?? "",
    severity: cve.severity ?? "MEDIUM",
    cvssScoreV3: String(cve.cvssScoreV3 ?? ""),
    affectedVersions: cve.affectedVersions.join(", "),
    cweIds: cve.cweIds.join(", "),
  });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      const response = await request<{ data: CveRecord }>(`/api/cves/${encodeURIComponent(cve.cveId)}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...form,
          cvssScoreV3: form.cvssScoreV3 ? Number(form.cvssScoreV3) : null,
          affectedVersions: form.affectedVersions
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          cweIds: form.cweIds
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });
      onSaved(response.data);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="editor-overlay">
      <section className="editor" role="dialog" aria-modal="true" aria-label="编辑漏洞记录">
        <div className="editor-header">
          <div>
            <div className="eyebrow">Triage / {cve.cveId}</div>
            <h2>编辑记录</h2>
            <span className="pill">
              <Activity size={13} /> 未保存的本地修改
            </span>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="关闭编辑">
            <X size={20} />
          </button>
        </div>
        <div className="editor-form">
          <div className="field">
            <label htmlFor="cve-title">标题</label>
            <input
              id="cve-title"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="cve-severity">严重度</label>
            <select
              id="cve-severity"
              value={form.severity}
              onChange={(event) => setForm({ ...form, severity: event.target.value })}
            >
              {Object.entries(severityLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="cve-score">CVSS v3</label>
            <input
              id="cve-score"
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={form.cvssScoreV3}
              onChange={(event) => setForm({ ...form, cvssScoreV3: event.target.value })}
            />
          </div>
          <div className="field">
            <label>
              来源识别 <Lock size={12} />
            </label>
            <input value={`${cve.sourceName ?? "NVD"} · ${cve.sourceId}`} disabled />
          </div>
          <div className="field full">
            <label htmlFor="cve-description">描述</label>
            <textarea
              id="cve-description"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="cve-versions">受影响版本</label>
            <input
              id="cve-versions"
              value={form.affectedVersions}
              onChange={(event) => setForm({ ...form, affectedVersions: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="cve-cwe">CWE</label>
            <input
              id="cve-cwe"
              value={form.cweIds}
              onChange={(event) => setForm({ ...form, cweIds: event.target.value })}
            />
          </div>
          <div className="field">
            <label>
              来源链接 <Lock size={12} />
            </label>
            <input value={cve.sourceLink ?? "—"} disabled />
          </div>
          <div className="editor-footer">
            <button className="secondary-button" onClick={onClose}>
              取消
            </button>
            <button className="primary-button" onClick={save} disabled={saving}>
              {saving ? "保存中…" : "保存修改"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

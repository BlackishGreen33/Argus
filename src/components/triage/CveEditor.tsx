"use client";

import { Activity, Lock, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="editor max-w-[920px] p-0" showCloseButton={false}>
        <DialogTitle className="sr-only">编辑漏洞记录</DialogTitle>
        <DialogDescription className="sr-only">修改漏洞标题、描述、评分和受影响版本。</DialogDescription>
        <div className="editor-header">
          <div>
            <div className="eyebrow">Triage / {cve.cveId}</div>
            <h2>编辑记录</h2>
            <span className="pill">
              <Activity size={13} /> 未保存的本地修改
            </span>
          </div>
          <Button variant="ghost" size="icon-sm" className="drawer-close" onClick={onClose} aria-label="关闭编辑">
            <X size={20} />
          </Button>
        </div>
        <div className="editor-form">
          <div className="field">
            <label htmlFor="cve-title">标题</label>
            <Input
              id="cve-title"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="cve-severity">严重度</label>
            <Select value={form.severity} onValueChange={(value) => setForm({ ...form, severity: value })}>
              <SelectTrigger id="cve-severity" aria-label="严重度">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(severityLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="field">
            <label htmlFor="cve-score">CVSS v3</label>
            <Input
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
            <Input value={`${cve.sourceName ?? "NVD"} · ${cve.sourceId}`} disabled />
          </div>
          <div className="field full">
            <label htmlFor="cve-description">描述</label>
            <Textarea
              id="cve-description"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="cve-versions">受影响版本</label>
            <Input
              id="cve-versions"
              value={form.affectedVersions}
              onChange={(event) => setForm({ ...form, affectedVersions: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="cve-cwe">CWE</label>
            <Input
              id="cve-cwe"
              value={form.cweIds}
              onChange={(event) => setForm({ ...form, cweIds: event.target.value })}
            />
          </div>
          <div className="field">
            <label>
              来源链接 <Lock size={12} />
            </label>
            <Input value={cve.sourceLink ?? "—"} disabled />
          </div>
          <div className="editor-footer">
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "保存中…" : "保存修改"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

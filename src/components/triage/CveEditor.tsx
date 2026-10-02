"use client";

import { Activity, Lock, X } from "lucide-react";
import React, { useState } from "react";

import { request } from "@/client/http";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n";
import type { CveRecord } from "@/types/domain";
import { severityLabelKeys } from "@/utils/labels";

interface CveEditorProps {
  cve: CveRecord;
  onClose: () => void;
  onSaved: (cve: CveRecord) => void;
}

export const CveEditor: React.FC<CveEditorProps> = ({ cve, onClose, onSaved }) => {
  const { t } = useI18n();
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
      window.alert(error instanceof Error ? error.message : t("triage.saveFailed"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="editor max-w-[920px] p-0" showCloseButton={false}>
        <DialogTitle className="sr-only">{t("triage.editRecord")}</DialogTitle>
        <DialogDescription className="sr-only">{t("triage.editTitle")}</DialogDescription>
        <div className="editor-header">
          <div>
            <div className="eyebrow">
              {t("page.triage.title")} / {cve.cveId}
            </div>
            <h2>{t("triage.editRecord")}</h2>
            <span className="pill">
              <Activity size={13} /> {t("triage.unsaved")}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="drawer-close"
            onClick={onClose}
            aria-label={t("action.closeEditor")}
          >
            <X size={20} />
          </Button>
        </div>
        <div className="editor-form">
          <div className="field">
            <label htmlFor="cve-title">{t("triage.titleLabel")}</label>
            <Input
              id="cve-title"
              name="title"
              autoComplete="off"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="cve-severity">{t("filter.severity")}</label>
            <Select
              value={form.severity}
              aria-label={t("filter.severity")}
              onValueChange={(value) => setForm({ ...form, severity: value })}
            >
              <SelectTrigger id="cve-severity" aria-label={t("filter.severity")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(severityLabelKeys).map(([value, key]) => (
                  <SelectItem key={value} value={value}>
                    {t(key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="field">
            <label htmlFor="cve-score">{t("triage.cvssLabel")}</label>
            <Input
              id="cve-score"
              name="cvss-score"
              autoComplete="off"
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={form.cvssScoreV3}
              onChange={(event) => setForm({ ...form, cvssScoreV3: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="cve-source-identification">
              {t("triage.sourceIdentification")} <Lock size={12} />
            </label>
            <Input
              id="cve-source-identification"
              name="source-identification"
              autoComplete="off"
              value={`${cve.sourceName ?? t("triage.sourceUnknown")} ${t("triage.historySeparator")} ${cve.sourceId}`}
              disabled
            />
          </div>
          <div className="field full">
            <label htmlFor="cve-description">{t("triage.descriptionLabel")}</label>
            <Textarea
              id="cve-description"
              name="description"
              autoComplete="off"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="cve-versions">{t("triage.versionsLabel")}</label>
            <Input
              id="cve-versions"
              name="affected-versions"
              autoComplete="off"
              value={form.affectedVersions}
              onChange={(event) => setForm({ ...form, affectedVersions: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="cve-cwe">{t("triage.cweLabel")}</label>
            <Input
              id="cve-cwe"
              name="cwe-ids"
              autoComplete="off"
              spellCheck={false}
              value={form.cweIds}
              onChange={(event) => setForm({ ...form, cweIds: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="cve-source-link">
              {t("triage.sourceLink")} <Lock size={12} />
            </label>
            <Input
              id="cve-source-link"
              name="source-link"
              autoComplete="off"
              value={cve.sourceLink ?? t("triage.noValue")}
              disabled
            />
          </div>
          <div className="editor-footer">
            <Button variant="outline" onClick={onClose}>
              {t("action.cancel")}
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? t("triage.saving") : t("triage.saveChanges")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

"use client";

import { Lock, Trash2, X } from "lucide-react";
import React, { useState } from "react";

import { request } from "@/client/http";
import { ConfirmActionDialog } from "@/components/ConfirmActionDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n";
import type { ComponentRecord } from "@/types/domain";

interface ComponentEditorProps {
  component: ComponentRecord | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onDeleted: () => Promise<void>;
  onError: (message: string) => void;
}

export const ComponentEditor: React.FC<ComponentEditorProps> = ({
  component,
  onClose,
  onSaved,
  onDeleted,
  onError,
}) => {
  const { t } = useI18n();
  const [form, setForm] = useState({
    purl: component?.purl ?? t("components.defaultPurl"),
    name: component?.name ?? "",
    version: component?.version ?? "",
    vendor: component?.vendor ?? "",
    type: component?.type ?? "maven",
    cpe: component?.cpe ?? "",
    license: component?.license ?? "",
    repository: component?.repository ?? "",
    description: component?.description ?? "",
  });
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const save = async () => {
    if (!form.purl.trim() || !form.name.trim() || !form.version.trim()) return onError(t("components.required"));
    try {
      await request(`/api/components${component ? `/${encodeURIComponent(component.purl)}` : ""}`, {
        method: component ? "PATCH" : "POST",
        body: JSON.stringify(form),
      });
      await onSaved();
    } catch (error) {
      onError(error instanceof Error ? error.message : t("components.saveFailed"));
    }
  };
  const remove = async () => {
    if (!component) return;
    setConfirmDeleteOpen(false);
    try {
      await request(`/api/components/${encodeURIComponent(component.purl)}`, { method: "DELETE" });
      await onDeleted();
    } catch (error) {
      onError(error instanceof Error ? error.message : t("components.deleteFailed"));
    }
  };
  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="editor max-w-[920px] p-0" showCloseButton={false}>
          <DialogTitle className="sr-only">
            {t(component ? "components.editorTitleEdit" : "components.editorTitleNew")}
          </DialogTitle>
          <DialogDescription className="sr-only">{t("components.editorDescription")}</DialogDescription>
          <div className="editor-header">
            <div>
              <div className="eyebrow">{t("page.components.title")}</div>
              <h2>{t(component ? "components.editorTitleEdit" : "components.editorTitleNew")}</h2>
              <p>{t("components.editorSubtitle")}</p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="drawer-close"
              onClick={onClose}
              aria-label={t("action.closeComponentEditor")}
            >
              <X size={20} />
            </Button>
          </div>
          <div className="editor-form">
            <div className="field full">
              <label htmlFor="component-purl">
                {t("components.purlLabel")} {component && <Lock size={12} />}
              </label>
              <Input
                id="component-purl"
                name="purl"
                autoComplete="off"
                spellCheck={false}
                value={form.purl}
                disabled={Boolean(component)}
                onChange={(event) => setForm({ ...form, purl: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="component-name">{t("components.name")}</label>
              <Input
                id="component-name"
                name="name"
                autoComplete="off"
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="component-version">{t("components.version")}</label>
              <Input
                id="component-version"
                name="version"
                autoComplete="off"
                required
                value={form.version}
                onChange={(event) => setForm({ ...form, version: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="component-vendor">{t("components.vendor")}</label>
              <Input
                id="component-vendor"
                name="vendor"
                autoComplete="off"
                value={form.vendor}
                onChange={(event) => setForm({ ...form, vendor: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="component-type">{t("components.editorType")}</label>
              <Input
                id="component-type"
                name="type"
                autoComplete="off"
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="component-cpe">{t("components.cpe")}</label>
              <Input
                id="component-cpe"
                name="cpe"
                autoComplete="off"
                spellCheck={false}
                value={form.cpe}
                onChange={(event) => setForm({ ...form, cpe: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="component-license">{t("components.license")}</label>
              <Input
                id="component-license"
                name="license"
                autoComplete="off"
                value={form.license}
                onChange={(event) => setForm({ ...form, license: event.target.value })}
              />
            </div>
            <div className="field full">
              <label htmlFor="component-repository">{t("components.repository")}</label>
              <Input
                id="component-repository"
                name="repository"
                autoComplete="off"
                value={form.repository}
                onChange={(event) => setForm({ ...form, repository: event.target.value })}
              />
            </div>
            <div className="field full">
              <label htmlFor="component-description">{t("components.description")}</label>
              <Textarea
                id="component-description"
                name="description"
                autoComplete="off"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>
            <div className="editor-footer">
              {component && (
                <Button variant="destructive" onClick={() => setConfirmDeleteOpen(true)}>
                  <Trash2 size={15} /> {t("action.deleteComponent")}
                </Button>
              )}
              <Button variant="outline" onClick={onClose}>
                {t("action.cancel")}
              </Button>
              <Button onClick={save}>{t(component ? "components.saveChanges" : "components.createSubmit")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmActionDialog
        open={confirmDeleteOpen}
        title={t("components.deleteTitle", { name: component?.name ?? t("components.name") })}
        description={t("components.deleteDescription")}
        onOpenChange={setConfirmDeleteOpen}
        onConfirm={() => void remove()}
      />
    </>
  );
};

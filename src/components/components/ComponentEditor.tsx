"use client";

import { Lock, Trash2, X } from "lucide-react";
import { useState } from "react";

import type { ComponentRecord } from "@/types/domain";
import { request } from "@/utils/http";

export function ComponentEditor({
  component,
  onClose,
  onSaved,
  onDeleted,
  onError,
}: {
  component: ComponentRecord | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onDeleted: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [form, setForm] = useState({
    purl: component?.purl ?? "pkg:maven/example/library@1.0.0",
    name: component?.name ?? "",
    version: component?.version ?? "",
    vendor: component?.vendor ?? "",
    type: component?.type ?? "maven",
    cpe: component?.cpe ?? "",
    license: component?.license ?? "",
    repository: component?.repository ?? "",
    description: component?.description ?? "",
  });
  const save = async () => {
    if (!form.purl.trim() || !form.name.trim() || !form.version.trim()) return onError("PURL、名称和版本不能为空");
    try {
      await request(`/api/components${component ? `/${encodeURIComponent(component.purl)}` : ""}`, {
        method: component ? "PATCH" : "POST",
        body: JSON.stringify(form),
      });
      await onSaved();
    } catch (error) {
      onError(error instanceof Error ? error.message : "组件保存失败");
    }
  };
  const remove = async () => {
    if (!component || !window.confirm(`确认删除组件 ${component.name}？关联候选关系也会被删除。`)) return;
    try {
      await request(`/api/components/${encodeURIComponent(component.purl)}`, { method: "DELETE" });
      await onDeleted();
    } catch (error) {
      onError(error instanceof Error ? error.message : "组件删除失败");
    }
  };
  return (
    <div className="editor-overlay">
      <section className="editor" role="dialog" aria-modal="true" aria-label="组件表单">
        <div className="editor-header">
          <div>
            <div className="eyebrow">Components</div>
            <h2>{component ? "编辑组件" : "新增组件"}</h2>
            <p>保留来源证据，同时维护本地元数据。</p>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="关闭组件表单">
            <X size={20} />
          </button>
        </div>
        <div className="editor-form">
          <div className="field full">
            <label htmlFor="component-purl">PURL {component && <Lock size={12} />}</label>
            <input
              id="component-purl"
              value={form.purl}
              disabled={Boolean(component)}
              onChange={(event) => setForm({ ...form, purl: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="component-name">名称</label>
            <input
              id="component-name"
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="component-version">版本</label>
            <input
              id="component-version"
              required
              value={form.version}
              onChange={(event) => setForm({ ...form, version: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="component-vendor">供应商</label>
            <input
              id="component-vendor"
              value={form.vendor}
              onChange={(event) => setForm({ ...form, vendor: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="component-type">类型</label>
            <input
              id="component-type"
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="component-cpe">CPE</label>
            <input
              id="component-cpe"
              value={form.cpe}
              onChange={(event) => setForm({ ...form, cpe: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="component-license">许可证</label>
            <input
              id="component-license"
              value={form.license}
              onChange={(event) => setForm({ ...form, license: event.target.value })}
            />
          </div>
          <div className="field full">
            <label htmlFor="component-repository">仓库链接</label>
            <input
              id="component-repository"
              value={form.repository}
              onChange={(event) => setForm({ ...form, repository: event.target.value })}
            />
          </div>
          <div className="field full">
            <label htmlFor="component-description">描述</label>
            <textarea
              id="component-description"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </div>
          <div className="editor-footer">
            {component && (
              <button className="danger-button" onClick={remove}>
                <Trash2 size={15} /> 删除组件
              </button>
            )}
            <button className="secondary-button" onClick={onClose}>
              取消
            </button>
            <button className="primary-button" onClick={save}>
              {component ? "保存修改" : "创建组件"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

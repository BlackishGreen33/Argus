"use client";

import { Bell, CheckCircle2, Clock3, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { AuditEvent } from "@/types/domain";
import { formatDate } from "@/utils/format";
import { request } from "@/utils/http";

const actionMeta: Record<string, { label: string; icon: typeof Bell }> = {
  STATUS_CHANGED: { label: "状态发生变化", icon: ShieldAlert },
  CVE_UPDATED: { label: "漏洞内容已更新", icon: CheckCircle2 },
  CVE_DELETED: { label: "漏洞已删除", icon: Trash2 },
  IMPORT_STARTED: { label: "数据刷新已开始", icon: RefreshCw },
  IMPORT_QUEUED: { label: "数据刷新已排队", icon: Clock3 },
  IMPORT_PREVIEW_READY: { label: "数据预览已就绪", icon: CheckCircle2 },
  IMPORT_MERGED: { label: "数据刷新已合并", icon: CheckCircle2 },
  IMPORT_FAILED: { label: "数据刷新失败", icon: ShieldAlert },
  BATCH_STATUS_CHANGED: { label: "批量状态已更新", icon: CheckCircle2 },
};

interface NotificationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCountChange: (count: number) => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ open, onOpenChange, onCountChange }) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void request<{ data: AuditEvent[] }>("/api/audit-events")
      .then((response) => {
        setEvents(response.data);
        onCountChange(response.data.length);
      })
      .catch(() => {
        setEvents([]);
        onCountChange(0);
      })
      .finally(() => setLoading(false));
  }, [onCountChange, open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(430px,100vw)]">
        <SheetHeader>
          <SheetTitle>通知中心</SheetTitle>
          <SheetDescription>
            这里汇总最近的漏洞处理、批量操作和数据刷新事件。关闭面板后，仍可点击顶部铃铛重新打开。
          </SheetDescription>
        </SheetHeader>
        <div className="notification-body">
          {loading && <div className="empty-state">正在加载通知…</div>}
          {!loading && !events.length && (
            <div className="notification-empty">
              <Bell size={22} />
              <strong>暂无通知</strong>
              <span>状态修改、删除、批量处理或数据刷新后，事件会显示在这里。</span>
            </div>
          )}
          {!loading && events.length > 0 && (
            <div className="notification-list">
              {events.map((event) => {
                const meta = actionMeta[event.action] ?? { label: event.action, icon: Clock3 };
                const Icon = meta.icon;
                return (
                  <article className="notification-item" key={event.id}>
                    <span className="notification-icon">
                      <Icon size={15} />
                    </span>
                    <div className="notification-copy">
                      <strong>{meta.label}</strong>
                      <span>
                        {event.cveId ?? event.componentPurl ?? event.targetId ?? "系统事件"}
                        {event.actorEmail ? ` · ${event.actorEmail}` : ""}
                      </span>
                      <time dateTime={event.createdAt}>{formatDate(event.createdAt)}</time>
                    </div>
                    <Badge variant="outline">操作日志</Badge>
                  </article>
                );
              })}
            </div>
          )}
          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            关闭面板
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

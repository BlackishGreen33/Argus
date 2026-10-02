"use client";

import { Bell, CheckCircle2, Clock3, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import { request } from "@/client/http";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useI18n } from "@/i18n";
import type { AuditEvent } from "@/types/domain";
import { formatDate } from "@/utils/format";

type ActionMeta = { key: string; icon: typeof Bell };
const actionMeta: Record<string, ActionMeta> = {
  STATUS_CHANGED: { key: "notifications.statusChanged", icon: ShieldAlert },
  CVE_UPDATED: { key: "notifications.cveUpdated", icon: CheckCircle2 },
  CVE_DELETED: { key: "notifications.cveDeleted", icon: Trash2 },
  IMPORT_STARTED: { key: "notifications.importStarted", icon: RefreshCw },
  IMPORT_QUEUED: { key: "notifications.importQueued", icon: Clock3 },
  IMPORT_PREVIEW_READY: { key: "notifications.importPreviewReady", icon: CheckCircle2 },
  IMPORT_MERGED: { key: "notifications.importMerged", icon: CheckCircle2 },
  IMPORT_FAILED: { key: "notifications.importFailed", icon: ShieldAlert },
  BATCH_STATUS_CHANGED: { key: "notifications.batchStatusChanged", icon: CheckCircle2 },
};

interface NotificationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCountChange: (count: number) => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ open, onOpenChange, onCountChange }) => {
  const { locale, t } = useI18n();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const initialized = useRef(false);
  const openRef = useRef(open);
  const requestId = useRef(0);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    const initialLoad = !initialized.current;
    if (!open && !initialLoad) return;
    initialized.current = true;
    const currentRequest = ++requestId.current;
    let active = true;
    if (open) setLoading(true);
    void request<{ data: AuditEvent[] }>("/api/audit-events")
      .then((response) => {
        if (!active || currentRequest !== requestId.current) return;
        setEvents(response.data);
        onCountChange(openRef.current ? 0 : response.data.length);
      })
      .catch(() => {
        if (!active || currentRequest !== requestId.current) return;
        setEvents([]);
        onCountChange(0);
      })
      .finally(() => {
        if (active && currentRequest === requestId.current) setLoading(false);
      });
    return () => {
      if (!initialLoad) active = false;
    };
  }, [onCountChange, open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(430px,100%)]">
        <SheetHeader>
          <SheetTitle>{t("notifications.title")}</SheetTitle>
          <SheetDescription>{t("notifications.description")}</SheetDescription>
        </SheetHeader>
        <div className="notification-body">
          {loading && <div className="empty-state">{t("notifications.loading")}</div>}
          {!loading && !events.length && (
            <div className="notification-empty">
              <Bell size={22} />
              <strong>{t("notifications.emptyTitle")}</strong>
              <span>{t("notifications.emptyDescription")}</span>
            </div>
          )}
          {!loading && events.length > 0 && (
            <div className="notification-list">
              {events.map((event) => {
                const meta = actionMeta[event.action];
                const Icon = meta?.icon ?? Clock3;
                return (
                  <article className="notification-item" key={event.id}>
                    <span className="notification-icon">
                      <Icon size={15} />
                    </span>
                    <div className="notification-copy">
                      <strong>{meta ? t(meta.key) : event.action}</strong>
                      <span>
                        {event.cveId ?? event.componentPurl ?? event.targetId ?? t("notifications.systemEvent")}
                        {event.actorEmail ? t("notifications.actorSuffix", { actor: event.actorEmail }) : ""}
                      </span>
                      <time dateTime={event.createdAt}>{formatDate(event.createdAt, locale, t("triage.noValue"))}</time>
                    </div>
                    <Badge variant="outline">{t("notifications.log")}</Badge>
                  </article>
                );
              })}
            </div>
          )}
          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            {t("action.closePanel")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

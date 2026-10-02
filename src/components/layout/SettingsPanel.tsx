"use client";

import type React from "react";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { THEME_OPTIONS, type ThemeAccent } from "@/constants/theme";
import { type Locale, useI18n } from "@/i18n";

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme: ThemeAccent;
  onThemeChange: (theme: ThemeAccent) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  open,
  onOpenChange,
  theme,
  onThemeChange,
  collapsed,
  onCollapsedChange,
}) => {
  const { locale, setLocale, t } = useI18n();
  const languages: Array<{ id: Locale; key: string }> = [
    { id: "zh-CN", key: "settings.language.zhCN" },
    { id: "zh-TW", key: "settings.language.zhTW" },
    { id: "en", key: "settings.language.en" },
  ];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(390px,100%)]">
        <SheetHeader>
          <SheetTitle>{t("settings.title")}</SheetTitle>
          <SheetDescription>{t("settings.description")}</SheetDescription>
        </SheetHeader>
        <div className="settings-body">
          <div>
            <div className="section-label">{t("settings.theme")}</div>
            <RadioGroup
              className="theme-grid"
              value={theme}
              onValueChange={(value) => onThemeChange(value as ThemeAccent)}
            >
              {THEME_OPTIONS.map((item) => (
                <label
                  key={item.id}
                  htmlFor={`theme-${item.id}`}
                  className={`theme-option ${theme === item.id ? "active" : ""}`}
                >
                  <RadioGroupItem id={`theme-${item.id}`} value={item.id} aria-label={t(item.key)} />
                  <span className="theme-swatch" data-theme={item.id} aria-hidden="true" />
                  <span>{t(item.key)}</span>
                </label>
              ))}
            </RadioGroup>
          </div>
          <Separator />
          <div>
            <div className="section-label">{t("settings.language")}</div>
            <RadioGroup className="language-grid" value={locale} onValueChange={(value) => setLocale(value as Locale)}>
              {languages.map((item) => (
                <label key={item.id} htmlFor={`language-${item.id}`} className="theme-option">
                  <RadioGroupItem id={`language-${item.id}`} value={item.id} aria-label={t(item.key)} />
                  <span>{t(item.key)}</span>
                </label>
              ))}
            </RadioGroup>
          </div>
          <Separator />
          <div className="settings-row">
            <div>
              <strong>{t("settings.sidebar")}</strong>
              <p>{t("settings.sidebarDescription")}</p>
            </div>
            <div className="settings-toggle">
              <Switch
                checked={collapsed}
                onCheckedChange={onCollapsedChange}
                aria-label={t(collapsed ? "settings.expandSidebar" : "settings.collapseSidebar")}
                title={t(collapsed ? "settings.expandSidebar" : "settings.collapseSidebar")}
              />
              <span>{t(collapsed ? "settings.collapsed" : "settings.expanded")}</span>
            </div>
          </div>
          <div className="settings-hint">{t("settings.keyboardHint")}</div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

"use client";

import type React from "react";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";

const themes = [
  { id: "terracotta", label: "陶土红", color: "#a84d32" },
  { id: "olive", label: "橄榄绿", color: "#5f765f" },
  { id: "graphite", label: "石墨灰", color: "#4d5663" },
] as const;

export type ThemeAccent = (typeof themes)[number]["id"];

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
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(390px,100vw)]">
        <SheetHeader>
          <SheetTitle>设置</SheetTitle>
          <SheetDescription>调整 Argus 的工作台偏好，这些设置只保存在当前浏览器。</SheetDescription>
        </SheetHeader>
        <div className="settings-body">
          <div>
            <div className="section-label">主题色</div>
            <RadioGroup
              className="theme-grid"
              value={theme}
              onValueChange={(value) => onThemeChange(value as ThemeAccent)}
            >
              {themes.map((item) => (
                <label
                  key={item.id}
                  htmlFor={`theme-${item.id}`}
                  className={`theme-option ${theme === item.id ? "active" : ""}`}
                >
                  <RadioGroupItem id={`theme-${item.id}`} value={item.id} aria-label={item.label} />
                  <span className="theme-swatch" style={{ backgroundColor: item.color }} />
                  <span>{item.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>
          <Separator />
          <div className="settings-row">
            <div>
              <strong>侧栏显示</strong>
              <p>折叠后只显示导航图标，展开后显示完整导航。</p>
            </div>
            <div className="settings-toggle">
              <Switch
                checked={collapsed}
                onCheckedChange={onCollapsedChange}
                aria-label={collapsed ? "展开侧栏" : "折叠侧栏"}
                title={collapsed ? "展开侧栏" : "折叠侧栏"}
              />
              <span>{collapsed ? "已折叠" : "已展开"}</span>
            </div>
          </div>
          <div className="settings-hint">
            全局搜索：<kbd>⌘／Ctrl</kbd> + <kbd>K</kbd>；关闭抽屉或面板：<kbd>Esc</kbd>。
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

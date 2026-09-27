"use client";

import { ArrowUpRight, BookOpen, Keyboard } from "lucide-react";
import type React from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const REPO_URL = "https://github.com/BlackishGreen33/Argus";

interface HelpPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HelpPanel: React.FC<HelpPanelProps> = ({ open, onOpenChange }) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(430px,100vw)]">
        <SheetHeader>
          <SheetTitle>帮助与文档</SheetTitle>
          <SheetDescription>用最短路径完成漏洞分流、组件核对和导入复核。</SheetDescription>
        </SheetHeader>
        <div className="help-body">
          <section>
            <div className="help-heading">
              <Keyboard size={16} /> 快捷键
            </div>
            <p>
              <kbd>⌘／Ctrl</kbd> + <kbd>K</kbd> 打开全局搜索；<kbd>Esc</kbd> 关闭当前抽屉或面板。
            </p>
          </section>
          <section>
            <div className="help-heading">
              <BookOpen size={16} /> 搜索区别
            </div>
            <p>顶部搜索查找 CVE、Component 和 PURL，并可跳转目标页面；Triage 下方搜索只筛选当前漏洞列表。</p>
          </section>
          <section>
            <div className="help-heading">列表操作</div>
            <p>电脑端右键漏洞记录，手机端长按漏洞记录，可打开查看详情和复制 CVE ID 菜单。</p>
          </section>
          <section>
            <div className="help-heading">状态定义</div>
            <p>
              <strong>待处理</strong> 表示尚未完成分流；<strong>已确认</strong> 表示已核对；<strong>已延后</strong>{" "}
              表示暂缓；<strong>误报</strong> 表示排除。
            </p>
          </section>
          <Separator />
          <div className="help-links">
            <Button variant="outline" asChild>
              <a href="/api/docs" target="_blank" rel="noreferrer">
                <BookOpen size={15} /> REST API 文档 <ArrowUpRight size={14} />
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={`${REPO_URL}/blob/main/README.md`} target="_blank" rel="noreferrer">
                <BookOpen size={15} /> README <ArrowUpRight size={14} />
              </a>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

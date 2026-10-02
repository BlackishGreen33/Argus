"use client";

import { ArrowUpRight, BookOpen, Keyboard } from "lucide-react";
import type React from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ARGUS_REPO_URL } from "@/constants/app";
import { useI18n } from "@/i18n";

interface HelpPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HelpPanel: React.FC<HelpPanelProps> = ({ open, onOpenChange }) => {
  const { t } = useI18n();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(430px,100%)]">
        <SheetHeader>
          <SheetTitle>{t("help.title")}</SheetTitle>
          <SheetDescription>{t("help.description")}</SheetDescription>
        </SheetHeader>
        <div className="help-body">
          <section>
            <div className="help-heading">
              <Keyboard size={16} /> {t("help.shortcuts")}
            </div>
            <p>
              <kbd>{t("help.modifier")}</kbd> + <kbd>{t("help.keyK")}</kbd> {t("help.shortcutsOpen")}{" "}
              <kbd>{t("help.keyEsc")}</kbd> {t("help.shortcutsClose")}
            </p>
          </section>
          <section>
            <div className="help-heading">
              <BookOpen size={16} /> {t("help.searchDifference")}
            </div>
            <p>{t("help.searchDifferenceBody")}</p>
          </section>
          <section>
            <div className="help-heading">{t("help.listActions")}</div>
            <p>{t("help.listActionsBody")}</p>
          </section>
          <section>
            <div className="help-heading">{t("help.statusDefinition")}</div>
            <p>{t("help.statusDefinitionBody")}</p>
          </section>
          <Separator />
          <div className="help-links">
            <Button variant="outline" asChild>
              <a href="/api/docs" target="_blank" rel="noreferrer">
                <BookOpen size={15} /> {t("help.apiDocs")} <ArrowUpRight size={14} />
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={`${ARGUS_REPO_URL}/blob/main/README.md`} target="_blank" rel="noreferrer">
                <BookOpen size={15} /> {t("help.readme")} <ArrowUpRight size={14} />
              </a>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

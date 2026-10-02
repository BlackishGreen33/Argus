"use client";

import type React from "react";
import type { ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface NavButtonProps {
  active?: boolean;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  href?: string;
  collapsed?: boolean;
}

export const NavButton: React.FC<NavButtonProps> = ({ active, icon, label, onClick, href, collapsed = false }) => {
  const className = `nav-button ${active ? "active" : ""} ${collapsed ? "collapsed" : ""}`;
  const button = href ? (
    <a className={className} href={href} target="_blank" rel="noreferrer" aria-label={label}>
      {icon}
      <span>{label}</span>
    </a>
  ) : (
    <button className={className} onClick={onClick} aria-label={label}>
      {icon}
      <span>{label}</span>
    </button>
  );

  return collapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  ) : (
    button
  );
};

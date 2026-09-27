import "./tailwind.css";
import "./globals.scss";

import type { Metadata } from "next";
import { Geist } from "next/font/google";
import type React from "react";

import { QueryProvider } from "@/components/QueryProvider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/utils/cn";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Argus · Vulnerability Triage",
  description: "A calm workspace for turning dependency evidence into security decisions.",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

const RootLayout: React.FC<RootLayoutProps> = ({ children }) => {
  return (
    <html lang="zh-CN" className={cn("font-sans", geist.variable)}>
      <body>
        <TooltipProvider>
          <QueryProvider>{children}</QueryProvider>
          <Toaster position="top-right" />
        </TooltipProvider>
      </body>
    </html>
  );
};

export default RootLayout;

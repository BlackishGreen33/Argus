import "./tailwind.css";
import "./globals.scss";

import type { Metadata } from "next";
import { Geist } from "next/font/google";
import type React from "react";

import { QueryProvider } from "@/client/providers/QueryProvider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/i18n";
import { serverMessages } from "@/i18n/server";
import { cn } from "@/utils/cn";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: serverMessages.meta.title,
  description: serverMessages.meta.description,
};

interface RootLayoutProps {
  children: React.ReactNode;
}

const RootLayout: React.FC<RootLayoutProps> = ({ children }) => {
  return (
    <html lang="zh-CN" className={cn("font-sans", geist.variable)}>
      <body>
        <TooltipProvider>
          <I18nProvider>
            <QueryProvider>{children}</QueryProvider>
          </I18nProvider>
          <Toaster position="bottom-right" />
        </TooltipProvider>
      </body>
    </html>
  );
};

export default RootLayout;

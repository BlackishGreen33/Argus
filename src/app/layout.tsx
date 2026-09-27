import "./globals.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Argus · Vulnerability Triage",
  description: "A calm workspace for turning dependency evidence into security decisions.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GLOBAL DEAL HUNTER｜全球羊毛情报中心",
  description: "全球优惠、免费资源、限时活动与金融服务优惠情报中心。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}

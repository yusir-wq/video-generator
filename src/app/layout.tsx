import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MiniMax H3 视频生成工具",
  description: "文生视频 / 参考图生视频工具，基于 MiniMax H3 API",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

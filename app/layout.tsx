import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LanguageProvider from "./shared/components/LanguageProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HAL问卷系统",
  description: "血友病活动列表（HAL）评估系统",
  authors: [{ name: "Junzhe Luo" }],
  creator: "Junzhe Luo",
  publisher: "Junzhe Luo",
  keywords: ["血友病", "HAL", "问卷", "评估"]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
        suppressHydrationWarning={true}
      >
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}

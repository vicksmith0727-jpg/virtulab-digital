import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VirtuaLab Digital — Organic Website Builder for Makers",
  description:
    "A full-stack, no-code website builder with drag & drop, AI copy, integrations, and earthy organic themes. No paid ads, ever.",
  keywords: [
    "website builder",
    "no-code",
    "drag and drop",
    "organic",
    "SaaS",
    "AI copy",
    "landing page builder",
    "VirtuaLab Digital",
  ],
  authors: [{ name: "VirtuaLab Digital" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "VirtuaLab Digital — Organic Website Builder",
    description: "No-code drag & drop builder with AI copy, organic themes, and integrations.",
    siteName: "VirtuaLab Digital",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VirtuaLab Digital — Organic Website Builder",
    description: "No-code drag & drop builder with AI copy, organic themes, and integrations.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import { AuthProvider } from "@/components/auth/AuthProvider";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "PuzzleArena",
  description: "Hệ thống giải đấu game giải đố trực tuyến: Sudoku và Dò mìn",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <Providers>
          <AuthProvider>
            <Suspense
              fallback={
                <div className="h-16 animate-pulse border-b border-slate-800 bg-slate-900" />
              }
            >
              <Navbar />
            </Suspense>
            {children}
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}

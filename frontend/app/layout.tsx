import "./globals.css"; // DÒNG QUAN TRỌNG NHẤT ĐỂ GỌI LẠI GIAO DIỆN!
import { Suspense } from "react";
import Navbar from "@/components/layout/Navbar";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={<div className="h-16 bg-slate-900 border-b border-slate-800 animate-pulse"></div>}>
          <Navbar />
        </Suspense>
        
        {children}
      </body>
    </html>
  );
}
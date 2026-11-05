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

const STRIP_EXTENSION_ATTRS_SCRIPT = `
(function () {
  var ATTRS = ["bis_skin_checked", "bis_register", "bis_size", "bis_id"];
  var SELECTOR = ATTRS.map(function (a) { return "[" + a + "]"; }).join(",");
  function cleanNode(el) {
    if (!el || el.nodeType !== 1) return;
    for (var i = 0; i < ATTRS.length; i++) {
      if (el.hasAttribute(ATTRS[i])) el.removeAttribute(ATTRS[i]);
    }
  }
  function cleanAll(root) {
    cleanNode(root);
    if (!root || !root.querySelectorAll) return;
    var nodes = root.querySelectorAll(SELECTOR);
    for (var i = 0; i < nodes.length; i++) cleanNode(nodes[i]);
  }
  cleanAll(document.documentElement);
  var obs = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var m = mutations[i];
      if (m.type === "attributes") {
        cleanNode(m.target);
      } else if (m.type === "childList") {
        for (var j = 0; j < m.addedNodes.length; j++) {
          cleanAll(m.addedNodes[j]);
        }
      }
    }
  });
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ATTRS,
    childList: true,
    subtree: true,
  });
  window.addEventListener("DOMContentLoaded", function () { cleanAll(document.documentElement); }, true);
  window.addEventListener("load", function () {
    cleanAll(document.documentElement);
    setTimeout(function () { obs.disconnect(); }, 3000);
  });
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: STRIP_EXTENSION_ATTRS_SCRIPT }}
        />
      </head>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
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

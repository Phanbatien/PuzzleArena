
import type { ReactNode } from "react";

type PageContainerProps = {
  title?: string;
  description?: string;
  className?: string;
  children: ReactNode;
};

export default function PageContainer({
  title,
  description,
  className = "",
  children,
}: PageContainerProps) {
  return (
    <main
      className={[
        "mx-auto min-h-[calc(100vh-72px)] w-full max-w-[1440px]",
        "px-4 pb-12 pt-6 sm:px-6 sm:pb-14 sm:pt-8",
        "lg:px-9 lg:pb-16 lg:pt-10",
        className,
      ].join(" ")}
    >
      {title && (
        <header className="relative mb-7 overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#14172C] via-[#101629] to-[#0D1929] px-5 py-6 sm:mb-8 sm:px-7 sm:py-7 lg:px-8">
          {/* Decorative lighting */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-violet-600/10 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 right-1/3 h-40 w-40 rounded-full bg-cyan-400/[0.07] blur-3xl"
          />

          <div className="relative z-10">
            <p className="mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-cyan-300/80 sm:text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.6)]" />
              PuzzleArena
            </p>

            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
              {title}
            </h1>

            {description && (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-[15px]">
                {description}
              </p>
            )}
          </div>
        </header>
      )}

      <div className="min-w-0">{children}</div>
    </main>
  );
}

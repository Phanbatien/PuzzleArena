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
      className={`mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 ${className}`}
    >
      {title && (
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-brand-700 sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-slate-600 sm:text-base">
              {description}
            </p>
          )}
        </header>
      )}
      {children}
    </main>
  );
}

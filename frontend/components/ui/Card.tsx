import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  title?: string;
};

export default function Card({
  title,
  className = "",
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
      {...rest}
    >
      {title && (
        <h3 className="mb-3 text-lg font-semibold text-slate-900">{title}</h3>
      )}
      {children}
    </div>
  );
}

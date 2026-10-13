type LoadingProps = {
  text?: string;
};

export default function Loading({ text = "Đang tải..." }: LoadingProps) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-3 py-8 text-slate-600"
    >
      <span className="h-6 w-6 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

"use client";

import { useAppPreferences } from "./app-preferences";

type Props = {
  count: number;
  className?: string;
};

export function TopicUploadIndicator({ count, className = "" }: Props) {
  const { language, t } = useAppPreferences();
  const hasFiles = count > 0;
  const statusLabel = hasFiles ? t("hasFiles") : t("noUpload");
  const countLabel =
    language === "th"
      ? `${count} ไฟล์`
      : `${count} ${count === 1 ? "file" : "files"}`;

  return (
    <span
      className={`pointer-events-none absolute right-2 top-2 flex items-center gap-1 ${className}`}
      aria-label={`${statusLabel}. ${countLabel}`}
      title={`${statusLabel} — ${countLabel}`}
    >
      <span className="min-w-[1ch] text-[10px] font-black tabular-nums leading-none text-(--ceremony-muted)">
        {count}
      </span>
      <span
        className={`size-3.5 shrink-0 rounded-full border-2 border-(--ceremony-surface) shadow-sm ${
          hasFiles ? "bg-emerald-500" : "bg-red-500"
        }`}
      />
    </span>
  );
}

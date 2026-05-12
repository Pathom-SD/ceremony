"use client";

import type { CeremonyDepartment } from "@/lib/ceremony-topics";

type Props = {
  department: CeremonyDepartment;
  onOpenTopic: (topicId: string) => void;
  fileCountsByTopic: Record<string, number>;
  className?: string;
  topicsClassName?: string;
};

function StatusDot({ hasFiles }: { hasFiles: boolean }) {
  const label = hasFiles ? "มีไฟล์อัปโหลดแล้ว" : "ยังไม่มีไฟล์อัปโหลด";

  return (
    <span
      aria-label={label}
      title={label}
      className={`absolute right-2 top-2 size-3.5 rounded-full border-2 border-[var(--ceremony-surface)] shadow-sm ${
        hasFiles ? "bg-emerald-500" : "bg-red-500"
      }`}
    />
  );
}

export function DepartmentCard({
  department,
  onOpenTopic,
  fileCountsByTopic,
  className = "",
  topicsClassName = "grid-cols-1",
}: Props) {
  return (
    <article
      className={`group flex min-h-0 flex-col overflow-hidden rounded-[18px] border border-[var(--ceremony-border)] bg-[var(--ceremony-surface)] shadow-[var(--ceremony-shadow)] transition hover:border-[color-mix(in_oklab,var(--ceremony-primary)_34%,var(--ceremony-border))] ${className}`}
    >
      <header className="flex min-h-11 items-center justify-between gap-3 border-b border-[var(--ceremony-border)] bg-[var(--ceremony-surface-2)] px-3 py-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ceremony-muted)]">
            แผนก
          </p>
          <h3 className="text-lg font-extrabold tracking-[-0.03em]">
            {department.name}
          </h3>
        </div>
        <span className="rounded-full bg-[var(--ceremony-primary-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--ceremony-primary)]">
          {department.topics.length} หัวข้อ
        </span>
      </header>
      <div className={`grid min-h-0 flex-1 gap-2 p-2 ${topicsClassName}`}>
        {department.topics.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onOpenTopic(t.id)}
            className="relative flex min-h-0 items-center justify-center rounded-[14px] border border-[var(--ceremony-border)] bg-[var(--ceremony-surface)] px-3 py-2 text-center text-[clamp(0.74rem,0.9vw,1.02rem)] font-bold leading-tight text-[var(--ceremony-ink)] transition hover:border-[var(--ceremony-primary)] hover:bg-[var(--ceremony-primary-soft)] hover:text-[var(--ceremony-primary)] focus-visible:ring-4 focus-visible:ring-[color-mix(in_oklab,var(--ceremony-ring)_18%,transparent)]"
          >
            <StatusDot hasFiles={(fileCountsByTopic[t.id] ?? 0) > 0} />
            {t.label}
          </button>
        ))}
      </div>
    </article>
  );
}

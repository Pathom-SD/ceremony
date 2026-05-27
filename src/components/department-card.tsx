"use client";

import type { CSSProperties } from "react";
import type { CeremonyDepartment } from "@/lib/ceremony-topics";
import { useAppPreferences } from "./app-preferences";
import { TopicUploadIndicator } from "./topic-upload-indicator";

type Props = {
  department: CeremonyDepartment;
  onOpenTopic: (topicId: string) => void;
  fileCountsByTopic: Record<string, number>;
  className?: string;
  topicsClassName?: string;
};

type DepartmentAccentStyle = CSSProperties & {
  "--department-accent": string;
  "--department-accent-soft": string;
  "--department-accent-glow": string;
};

const departmentAccents: Record<string, DepartmentAccentStyle> = {
  mk: {
    "--department-accent": "oklch(0.62 0.18 24)",
    "--department-accent-soft": "oklch(0.62 0.18 24 / 0.14)",
    "--department-accent-glow": "oklch(0.62 0.18 24 / 0.08)",
  },
  med: {
    "--department-accent": "oklch(0.58 0.16 255)",
    "--department-accent-soft": "oklch(0.58 0.16 255 / 0.14)",
    "--department-accent-glow": "oklch(0.58 0.16 255 / 0.08)",
  },
  mep: {
    "--department-accent": "oklch(0.58 0.16 150)",
    "--department-accent-soft": "oklch(0.58 0.16 150 / 0.14)",
    "--department-accent-glow": "oklch(0.58 0.16 150 / 0.08)",
  },
  ee: {
    "--department-accent": "oklch(0.62 0.16 82)",
    "--department-accent-soft": "oklch(0.62 0.16 82 / 0.16)",
    "--department-accent-glow": "oklch(0.62 0.16 82 / 0.09)",
  },
  qc: {
    "--department-accent": "oklch(0.6 0.17 310)",
    "--department-accent-soft": "oklch(0.6 0.17 310 / 0.14)",
    "--department-accent-glow": "oklch(0.6 0.17 310 / 0.08)",
  },
  pe: {
    "--department-accent": "oklch(0.6 0.16 205)",
    "--department-accent-soft": "oklch(0.6 0.16 205 / 0.14)",
    "--department-accent-glow": "oklch(0.6 0.16 205 / 0.08)",
  },
};

const defaultDepartmentAccent: DepartmentAccentStyle = {
  "--department-accent": "var(--ceremony-primary)",
  "--department-accent-soft": "var(--ceremony-primary-soft)",
  "--department-accent-glow": "color-mix(in oklab, var(--ceremony-primary) 8%, transparent)",
};

export function DepartmentCard({
  department,
  onOpenTopic,
  fileCountsByTopic,
  className = "",
  topicsClassName = "grid-cols-1",
}: Props) {
  const { t } = useAppPreferences();
  const accentStyle = departmentAccents[department.id] ?? defaultDepartmentAccent;

  return (
    <article
      style={accentStyle}
      className={`group relative flex min-h-0 flex-col overflow-hidden rounded-[18px] border border-[color-mix(in_oklab,var(--department-accent)_22%,var(--ceremony-border))] bg-[linear-gradient(180deg,var(--department-accent-glow),var(--ceremony-surface)_46%)] shadow-(--ceremony-shadow) transition hover:border-[color-mix(in_oklab,var(--department-accent)_54%,var(--ceremony-border))] hover:shadow-lg ${className}`}
    >
      <div className="h-1 shrink-0 bg-(--department-accent)" />
      <header className="flex min-h-11 items-center justify-between gap-3 border-b border-[color-mix(in_oklab,var(--department-accent)_20%,var(--ceremony-border))] bg-[linear-gradient(135deg,var(--department-accent-soft),var(--ceremony-surface-2)_72%)] px-3 py-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color-mix(in_oklab,var(--department-accent)_82%,var(--ceremony-ink))]">
            {t("department")}
          </p>
          <h3 className="text-lg font-extrabold tracking-[-0.03em] text-[color-mix(in_oklab,var(--department-accent)_24%,var(--ceremony-ink))]">
            {department.name}
          </h3>
        </div>
        {/* <span className="rounded-full bg-(--ceremony-primary-soft) px-2.5 py-1 text-[11px] font-bold text-(--ceremony-primary)">
          {department.topics.length}
        </span> */}
      </header>
      <div className={`grid min-h-0 flex-1 gap-2 p-2 ${topicsClassName}`}>
        {department.topics.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onOpenTopic(t.id)}
            className="relative flex min-h-0 items-center justify-center rounded-[14px] border border-[color-mix(in_oklab,var(--department-accent)_12%,var(--ceremony-border))] bg-[color-mix(in_oklab,var(--department-accent)_4%,var(--ceremony-surface))] px-3 py-2 text-center text-[clamp(0.74rem,0.9vw,1.02rem)] font-bold leading-tight text-foreground transition hover:border-(--department-accent) hover:bg-(--department-accent-soft) hover:text-[color-mix(in_oklab,var(--department-accent)_78%,var(--ceremony-ink))] focus-visible:ring-4 focus-visible:ring-[color-mix(in_oklab,var(--department-accent)_22%,transparent)]"
          >
            <TopicUploadIndicator count={fileCountsByTopic[t.id] ?? 0} />
            {t.label}
          </button>
        ))}
      </div>
    </article>
  );
}

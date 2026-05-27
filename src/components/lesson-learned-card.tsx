"use client";

import { TopicUploadIndicator } from "./topic-upload-indicator";

type Props = {
  onOpen: () => void;
  fileCount: number;
  className?: string;
};

export function LessonLearnedCard({ onOpen, fileCount, className = "" }: Props) {
  return (
    <section className={`min-h-0 ${className}`} aria-label="Lesson Learned">
      <button
        type="button"
        onClick={onOpen}
        className="group flex h-full w-full min-h-0 flex-col overflow-hidden rounded-[18px] border border-(--ceremony-border) bg-(--ceremony-surface) text-left shadow-(--ceremony-shadow) transition hover:border-(--ceremony-primary)"
      >
        {/* <div className="flex min-h-11 items-center justify-between border-b border-(--ceremony-border) bg-(--ceremony-primary-soft) px-3 py-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-(--ceremony-primary)">
              Shared
            </p>
            <p className="text-sm font-extrabold tracking-[-0.02em]">
              {t("shared")}
            </p>
          </div>
          <span className="rounded-full bg-(--ceremony-primary) px-2.5 py-1 text-[11px] font-bold text-(--ceremony-primary-ink)">
            {t("openFile")}
          </span>
        </div> */}
        <div className="relative flex flex-1 items-center justify-center p-3">
          <TopicUploadIndicator count={fileCount} />
          <p className="text-center text-[clamp(0.82rem,1vw,1.1rem)] font-extrabold leading-tight tracking-[-0.02em]">
            Lesson Learned & Challenge Points
          </p>
        </div>
      </button>
    </section>
  );
}

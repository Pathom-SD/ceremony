"use client";

type Props = {
  onOpen: () => void;
  hasFiles: boolean;
  className?: string;
};

export function LessonLearnedCard({ onOpen, hasFiles, className = "" }: Props) {
  const statusLabel = hasFiles ? "มีไฟล์อัปโหลดแล้ว" : "ยังไม่มีไฟล์อัปโหลด";

  return (
    <section className={`min-h-0 ${className}`} aria-label="Lesson Learned">
      <button
        type="button"
        onClick={onOpen}
        className="group flex h-full w-full min-h-0 flex-col overflow-hidden rounded-[18px] border border-[var(--ceremony-border)] bg-[var(--ceremony-surface)] text-left shadow-[var(--ceremony-shadow)] transition hover:border-[var(--ceremony-primary)]"
      >
        <div className="flex min-h-11 items-center justify-between border-b border-[var(--ceremony-border)] bg-[var(--ceremony-primary-soft)] px-3 py-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ceremony-primary)]">
              Shared
            </p>
            <p className="text-sm font-extrabold tracking-[-0.02em]">
              หัวข้อร่วม
            </p>
          </div>
          <span className="rounded-full bg-[var(--ceremony-primary)] px-2.5 py-1 text-[11px] font-bold text-[var(--ceremony-primary-ink)]">
            เปิด
          </span>
        </div>
        <div className="relative flex flex-1 items-center justify-center p-3">
          <span
            aria-label={statusLabel}
            title={statusLabel}
            className={`absolute right-2 top-2 size-3.5 rounded-full border-2 border-[var(--ceremony-surface)] shadow-sm ${
              hasFiles ? "bg-emerald-500" : "bg-red-500"
            }`}
          />
          <p className="text-center text-[clamp(0.82rem,1vw,1.1rem)] font-extrabold leading-tight tracking-[-0.02em]">
            Lesson Learned & Challenge Points
          </p>
        </div>
      </button>
    </section>
  );
}

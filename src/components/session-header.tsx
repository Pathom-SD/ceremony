"use client";

import { useState } from "react";
import type { SessionPayload } from "@/lib/session-types";

type Props = {
  session: SessionPayload;
  onSaved: (s: SessionPayload) => void;
};

export function SessionHeader({ session, onSaved }: Props) {
  const [draft, setDraft] = useState(session);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const dirty =
    draft.projectName !== session.projectName ||
    draft.projectNo !== session.projectNo ||
    draft.customer !== session.customer ||
    draft.ceremonyDate !== session.ceremonyDate;

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/session", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error("save failed");
      const next = (await res.json()) as SessionPayload;
      onSaved(next);
      setDraft(next);
      setMessage("บันทึกแล้ว");
      setTimeout(() => setMessage(null), 2500);
    } catch {
      setMessage("บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className="min-w-0 flex-1 rounded-[18px] border border-[var(--ceremony-border)] bg-[var(--ceremony-surface)] p-3 shadow-[var(--ceremony-shadow)]"
      aria-label="ข้อมูลโปรเจ็กต์"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ceremony-muted)]">
            Meeting info
          </p>
          <h2 className="text-sm font-extrabold tracking-[-0.02em]">
            ข้อมูลการประชุม
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {message ? (
            <span className="rounded-full bg-[var(--ceremony-primary-soft)] px-2.5 py-1 text-xs font-bold text-[var(--ceremony-primary)]">
              {message}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !dirty}
            className="min-h-9 rounded-full bg-[var(--ceremony-primary)] px-4 text-xs font-bold text-[var(--ceremony-primary-ink)] transition enabled:hover:shadow-lg disabled:opacity-40"
          >
            {saving ? "กำลังบันทึก…" : "บันทึก"}
          </button>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-bold text-[var(--ceremony-muted)]">
            Project Name
          </span>
          <input
            className="min-h-9 rounded-xl border border-[var(--ceremony-border)] bg-[var(--ceremony-surface-2)] px-3 py-1.5 text-sm font-medium outline-none transition focus:border-[var(--ceremony-ring)] focus:bg-[var(--ceremony-surface)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--ceremony-ring)_16%,transparent)]"
            value={draft.projectName}
            onChange={(e) =>
              setDraft((d) => ({ ...d, projectName: e.target.value }))
            }
            placeholder="ชื่อโปรเจ็กต์"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-bold text-[var(--ceremony-muted)]">
            Project No.
          </span>
          <input
            className="min-h-9 rounded-xl border border-[var(--ceremony-border)] bg-[var(--ceremony-surface-2)] px-3 py-1.5 text-sm font-medium outline-none transition focus:border-[var(--ceremony-ring)] focus:bg-[var(--ceremony-surface)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--ceremony-ring)_16%,transparent)]"
            value={draft.projectNo}
            onChange={(e) =>
              setDraft((d) => ({ ...d, projectNo: e.target.value }))
            }
            placeholder="เลขที่โปรเจ็กต์"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-bold text-[var(--ceremony-muted)]">
            Customer
          </span>
          <input
            className="min-h-9 rounded-xl border border-[var(--ceremony-border)] bg-[var(--ceremony-surface-2)] px-3 py-1.5 text-sm font-medium outline-none transition focus:border-[var(--ceremony-ring)] focus:bg-[var(--ceremony-surface)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--ceremony-ring)_16%,transparent)]"
            value={draft.customer}
            onChange={(e) =>
              setDraft((d) => ({ ...d, customer: e.target.value }))
            }
            placeholder="ลูกค้า"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-bold text-[var(--ceremony-muted)]">
            Ceremony Date
          </span>
          <input
            type="date"
            className="min-h-9 rounded-xl border border-[var(--ceremony-border)] bg-[var(--ceremony-surface-2)] px-3 py-1.5 text-sm font-medium outline-none transition focus:border-[var(--ceremony-ring)] focus:bg-[var(--ceremony-surface)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--ceremony-ring)_16%,transparent)]"
            value={draft.ceremonyDate}
            onChange={(e) =>
              setDraft((d) => ({ ...d, ceremonyDate: e.target.value }))
            }
          />
        </label>
      </div>
    </section>
  );
}

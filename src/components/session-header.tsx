"use client";

import { useState, type ReactNode } from "react";
import type { SessionPayload } from "@/lib/session-types";
import { DateSelect } from "./date-select";
import { useAppPreferences } from "./app-preferences";

type Props = {
  session: SessionPayload;
  onSaved: (s: SessionPayload) => void;
  /** ปุ่มเคลียร์ข้อมูล — แสดงก่อนปุ่มบันทึก */
  clearSlot?: ReactNode;
};

export function SessionHeader({ session, onSaved, clearSlot }: Props) {
  const { t } = useAppPreferences();
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
      setMessage(t("saved"));
      setTimeout(() => setMessage(null), 2500);
    } catch {
      setMessage(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className="min-w-0 flex-1 rounded-[18px] border border-(--ceremony-border) bg-(--ceremony-surface) p-3 shadow-(--ceremony-shadow)"
      aria-label="ข้อมูลโปรเจ็กต์"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-(--ceremony-muted)">
            Meeting info
          </p>
          <h2 className="text-sm font-extrabold tracking-[-0.02em]">
            {t("meetingInfo")}
          </h2>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {message ? (
            <span className="rounded-full bg-(--ceremony-primary-soft) px-2.5 py-1 text-xs font-bold text-(--ceremony-primary)">
              {message}
            </span>
          ) : null}
          {clearSlot}
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !dirty}
            className="min-h-9 shrink-0 rounded-full bg-(--ceremony-primary) px-4 text-xs font-bold text-(--ceremony-primary-ink) transition enabled:hover:shadow-lg disabled:opacity-40"
          >
            {saving ? t("saving") : t("save")}
          </button>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-bold text-(--ceremony-muted)">
            {t("projectName")}
          </span>
          <input
            className="min-h-9 rounded-xl border border-(--ceremony-border) bg-(--ceremony-surface-2) px-3 py-1.5 text-sm font-medium outline-none transition focus:border-(--ceremony-ring) focus:bg-(--ceremony-surface) focus:ring-4 focus:ring-[color-mix(in_oklab,var(--ceremony-ring)_16%,transparent)]"
            value={draft.projectName}
            onChange={(e) =>
              setDraft((d) => ({ ...d, projectName: e.target.value }))
            }
            placeholder={t("projectNamePlaceholder")}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-bold text-(--ceremony-muted)">
            {t("projectNo")}
          </span>
          <input
            className="min-h-9 rounded-xl border border-(--ceremony-border) bg-(--ceremony-surface-2) px-3 py-1.5 text-sm font-medium outline-none transition focus:border-(--ceremony-ring) focus:bg-(--ceremony-surface) focus:ring-4 focus:ring-[color-mix(in_oklab,var(--ceremony-ring)_16%,transparent)]"
            value={draft.projectNo}
            onChange={(e) =>
              setDraft((d) => ({ ...d, projectNo: e.target.value }))
            }
            placeholder={t("projectNoPlaceholder")}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-bold text-(--ceremony-muted)">
            {t("customer")}
          </span>
          <input
            className="min-h-9 rounded-xl border border-(--ceremony-border) bg-(--ceremony-surface-2) px-3 py-1.5 text-sm font-medium outline-none transition focus:border-(--ceremony-ring) focus:bg-(--ceremony-surface) focus:ring-4 focus:ring-[color-mix(in_oklab,var(--ceremony-ring)_16%,transparent)]"
            value={draft.customer}
            onChange={(e) =>
              setDraft((d) => ({ ...d, customer: e.target.value }))
            }
            placeholder="ลูกค้า"
          />
        </label>
        <DateSelect
          label={t("ceremonyDate")}
          value={draft.ceremonyDate}
          compact
          placement="bottom"
          onChange={(ceremonyDate) =>
            setDraft((d) => ({ ...d, ceremonyDate }))
          }
        />
      </div>
    </section>
  );
}

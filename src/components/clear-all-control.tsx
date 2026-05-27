"use client";

import { useState } from "react";
import { useAppPreferences } from "./app-preferences";

type Props = {
  onCleared: () => void;
  /** แบบเต็มความกว้าง (sidebar) หรือแบบแถบเครื่องมือข้างปุ่มบันทึก */
  triggerVariant?: "block" | "toolbar";
};

export function ClearAllControl({ onCleared, triggerVariant = "block" }: Props) {
  const { t } = useAppPreferences();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    setErr(null);
  };

  const runClear = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/clear", { method: "POST" });
      if (!res.ok) throw new Error("clear failed");
      onCleared();
      close();
    } catch {
      setErr(t("clearFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          triggerVariant === "toolbar"
            ? "min-h-9 shrink-0 rounded-full border border-[color-mix(in_oklab,var(--ceremony-danger)_28%,transparent)] bg-(--ceremony-danger-soft) px-4 text-xs font-bold text-(--ceremony-danger) transition hover:-translate-y-0.5 hover:bg-[color-mix(in_oklab,var(--ceremony-danger-soft)_78%,white)]"
            : "min-h-11 w-full shrink-0 rounded-full border border-[color-mix(in_oklab,var(--ceremony-danger)_28%,transparent)] bg-(--ceremony-danger-soft) px-4 text-sm font-bold text-(--ceremony-danger) transition hover:-translate-y-0.5 hover:bg-[color-mix(in_oklab,var(--ceremony-danger-soft)_78%,white)]"
        }
      >
        {t("clearAll")}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-[oklch(0.17_0.03_255/0.54)] p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-w-md rounded-[24px] border border-(--ceremony-border) bg-(--ceremony-surface) p-6 shadow-2xl">
            <h3 className="text-xl font-bold tracking-[-0.02em] text-(--ceremony-danger)">
              {t("confirmClear")}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-(--ceremony-muted)">
              {t("confirmClearDescription")}
            </p>
            {err ? (
              <p className="mt-3 rounded-2xl bg-(--ceremony-danger-soft) px-4 py-3 text-sm font-medium text-(--ceremony-danger)">
                {err}
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="min-h-10 rounded-full px-4 text-sm font-semibold text-(--ceremony-muted) hover:bg-(--ceremony-surface-2)"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void runClear()}
                className="min-h-10 rounded-full bg-(--ceremony-danger) px-4 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                {busy ? t("clearing") : t("confirmDeleteAll")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

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
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [secret, setSecret] = useState("");

  const close = () => {
    setStep(0);
    setErr(null);
    setSecret("");
  };

  const runClear = async (headerSecret?: string) => {
    setBusy(true);
    setErr(null);
    try {
      const headers: Record<string, string> = {};
      if (headerSecret) headers["x-ceremony-clear-secret"] = headerSecret;
      const res = await fetch("/api/admin/clear", { method: "POST", headers });
      if (res.status === 401) {
        setErr(t("secretRequired"));
        setStep(2);
        return;
      }
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
        onClick={() => setStep(1)}
        className={
          triggerVariant === "toolbar"
            ? "min-h-9 shrink-0 rounded-full border border-[color-mix(in_oklab,var(--ceremony-danger)_28%,transparent)] bg-(--ceremony-danger-soft) px-4 text-xs font-bold text-(--ceremony-danger) transition hover:-translate-y-0.5 hover:bg-[color-mix(in_oklab,var(--ceremony-danger-soft)_78%,white)]"
            : "min-h-11 w-full shrink-0 rounded-full border border-[color-mix(in_oklab,var(--ceremony-danger)_28%,transparent)] bg-(--ceremony-danger-soft) px-4 text-sm font-bold text-(--ceremony-danger) transition hover:-translate-y-0.5 hover:bg-[color-mix(in_oklab,var(--ceremony-danger-soft)_78%,white)]"
        }
      >
        {t("clearAll")}
      </button>

      {step === 1 ? (
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
                onClick={() => setStep(2)}
                className="min-h-10 rounded-full bg-(--ceremony-danger) px-4 text-sm font-bold text-white hover:opacity-90"
              >
                {t("continue")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-[oklch(0.17_0.03_255/0.54)] p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-w-md rounded-[24px] border border-(--ceremony-border) bg-(--ceremony-surface) p-6 shadow-2xl">
            <h3 className="text-xl font-bold tracking-[-0.02em] text-(--ceremony-danger)">
              {t("finalConfirm")}
            </h3>
            <p className="mt-3 text-sm text-(--ceremony-muted)">
              {t("finalConfirmDescription")}
            </p>
            <label className="mt-4 block text-sm">
              <span className="text-(--ceremony-muted)">
                {t("clearSecret")}
              </span>
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-2xl border border-(--ceremony-border) bg-(--ceremony-surface-2) px-4 py-2 outline-none focus:border-(--ceremony-ring) focus:ring-4 focus:ring-[color-mix(in_oklab,var(--ceremony-ring)_16%,transparent)]"
                placeholder={t("clearSecretPlaceholder")}
                autoComplete="off"
              />
            </label>
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
                onClick={() => void runClear(secret.trim() || undefined)}
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

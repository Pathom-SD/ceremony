"use client";

import { useState } from "react";

type Props = {
  onCleared: () => void;
};

export function ClearAllControl({ onCleared }: Props) {
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
        setErr("ต้องใส่รหัสลับ (ตั้งค่า CEREMONY_CLEAR_SECRET บน server)");
        setStep(2);
        return;
      }
      if (!res.ok) throw new Error("clear failed");
      onCleared();
      close();
    } catch {
      setErr("เคลียร์ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setStep(1)}
        className="min-h-11 w-full shrink-0 rounded-full border border-[color-mix(in_oklab,var(--ceremony-danger)_28%,transparent)] bg-[var(--ceremony-danger-soft)] px-4 text-sm font-bold text-[var(--ceremony-danger)] transition hover:-translate-y-0.5 hover:bg-[color-mix(in_oklab,var(--ceremony-danger-soft)_78%,white)]"
      >
        เคลียร์ข้อมูลทั้งหมด
      </button>

      {step === 1 ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[oklch(0.17_0.03_255/0.54)] p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-w-md rounded-[24px] border border-[var(--ceremony-border)] bg-[var(--ceremony-surface)] p-6 shadow-2xl">
            <h3 className="text-xl font-bold tracking-[-0.02em] text-[var(--ceremony-danger)]">
              ยืนยันการเคลียร์
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--ceremony-muted)]">
              จะลบข้อมูลโปรเจ็กต์ในหัวข้อด้านบนและไฟล์ที่อัปโหลดทั้งหมด
              การกระทำนี้ใช้สำหรับเริ่มประชุมครั้งใหม่
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="min-h-10 rounded-full px-4 text-sm font-semibold text-[var(--ceremony-muted)] hover:bg-[var(--ceremony-surface-2)]"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="min-h-10 rounded-full bg-[var(--ceremony-danger)] px-4 text-sm font-bold text-white hover:opacity-90"
              >
                ดำเนินการต่อ
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[oklch(0.17_0.03_255/0.54)] p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-w-md rounded-[24px] border border-[var(--ceremony-border)] bg-[var(--ceremony-surface)] p-6 shadow-2xl">
            <h3 className="text-xl font-bold tracking-[-0.02em] text-[var(--ceremony-danger)]">
              ยืนยันครั้งสุดท้าย
            </h3>
            <p className="mt-3 text-sm text-[var(--ceremony-muted)]">
              กดปุ่มด้านล่างเพื่อลบข้อมูลทั้งหมดอย่างถาวร
            </p>
            <label className="mt-4 block text-sm">
              <span className="text-[var(--ceremony-muted)]">
                รหัสลับ (ถ้า server ตั้งค่าไว้)
              </span>
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-2xl border border-[var(--ceremony-border)] bg-[var(--ceremony-surface-2)] px-4 py-2 outline-none focus:border-[var(--ceremony-ring)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--ceremony-ring)_16%,transparent)]"
                placeholder="ไม่บังคับถ้าไม่ได้ตั้งค่า"
                autoComplete="off"
              />
            </label>
            {err ? (
              <p className="mt-3 rounded-2xl bg-[var(--ceremony-danger-soft)] px-4 py-3 text-sm font-medium text-[var(--ceremony-danger)]">
                {err}
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="min-h-10 rounded-full px-4 text-sm font-semibold text-[var(--ceremony-muted)] hover:bg-[var(--ceremony-surface-2)]"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void runClear(secret.trim() || undefined)}
                className="min-h-10 rounded-full bg-[var(--ceremony-danger)] px-4 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "กำลังลบ…" : "ยืนยันลบทั้งหมด"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

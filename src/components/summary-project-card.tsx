"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ZoomIn, X } from "lucide-react";
import { DateSelect, formatLocalizedDate } from "./date-select";
import type { SessionPayload, SummaryProjectPayload } from "@/lib/session-types";
import { useAppPreferences } from "./app-preferences";

type Props = {
  summary: SummaryProjectPayload;
  onSaved: (session: SessionPayload) => void;
};

const summaryFields: Array<{
  key: keyof SummaryProjectPayload;
  short: string;
  label: string;
  accentVar: string;
  accentSoftVar: string;
}> = [
  {
    key: "quality",
    short: "Q",
    label: "Quality",
    accentVar: "--ceremony-accent-quality",
    accentSoftVar: "--ceremony-accent-quality-soft",
  },
  {
    key: "price",
    short: "P",
    label: "Price",
    accentVar: "--ceremony-accent-price",
    accentSoftVar: "--ceremony-accent-price-soft",
  },
  {
    key: "actual",
    short: "A",
    label: "Actual",
    accentVar: "--ceremony-accent-actual",
    accentSoftVar: "--ceremony-accent-actual-soft",
  },
  {
    key: "delivery",
    short: "D",
    label: "Delivery",
    accentVar: "--ceremony-accent-delivery",
    accentSoftVar: "--ceremony-accent-delivery-soft",
  },
];

const inputFields = summaryFields.filter((field) => field.key !== "delivery");

function displayValue(value: string) {
  return value.trim() || "-";
}

function parseNumberValue(value: string) {
  const normalized = value
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "")
    .trim();
  if (!normalized) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

/** Q / P / A: อนุญาตเฉพาะ 0–9 และจุดทศนิยมได้ไม่เกินหนึ่งจุด */
function sanitizeDecimalNumberString(raw: string) {
  const cleaned = raw.replace(/,/g, "").replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return `${cleaned.slice(0, firstDot + 1)}${cleaned.slice(firstDot + 1).replace(/\./g, "")}`;
}

function displayPercent(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "-";
  if (trimmed.endsWith("%")) return trimmed;
  return `${trimmed}%`;
}

function displayBaht(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "-";
  const number = parseNumberValue(trimmed);
  if (number === null) return trimmed;

  return `฿${number.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })}`;
}

function displaySummaryValue(key: keyof SummaryProjectPayload, value: string, language: "th" | "en") {
  if (key === "quality") return displayPercent(value);
  if (key === "price" || key === "actual") return displayBaht(value);
  if (key === "delivery") return formatLocalizedDate(value, language);
  return displayValue(value);
}

export function SummaryProjectCard({ summary, onSaved }: Props) {
  const { language, t } = useAppPreferences();
  const [open, setOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [drawerEntered, setDrawerEntered] = useState(false);
  const afterDrawerCloseRef = useRef<(() => void) | null>(null);
  const drawerEnteredRef = useRef(false);
  const drawerCloseConsumedRef = useRef(false);
  const drawerCloseFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draft, setDraft] = useState(summary);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearDrawerCloseFallback = useCallback(() => {
    if (drawerCloseFallbackRef.current != null) {
      clearTimeout(drawerCloseFallbackRef.current);
      drawerCloseFallbackRef.current = null;
    }
  }, []);

  const finishDrawerUnmount = useCallback(() => {
    clearDrawerCloseFallback();
    setDrawerMounted(false);
    const next = afterDrawerCloseRef.current;
    afterDrawerCloseRef.current = null;
    queueMicrotask(() => next?.());
  }, [clearDrawerCloseFallback]);

  const openDrawer = useCallback(() => {
    afterDrawerCloseRef.current = null;
    clearDrawerCloseFallback();

    if (drawerMounted && drawerEntered) {
      return;
    }

    if (!drawerMounted) {
      drawerEnteredRef.current = false;
      setDrawerMounted(true);
      setDrawerEntered(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          drawerEnteredRef.current = true;
          setDrawerEntered(true);
        });
      });
      return;
    }

    drawerEnteredRef.current = true;
    setDrawerEntered(true);
  }, [drawerMounted, drawerEntered, clearDrawerCloseFallback]);

  const beginCloseDrawer = useCallback(() => {
    if (!drawerMounted) return;
    if (!drawerEnteredRef.current) {
      finishDrawerUnmount();
      return;
    }
    drawerEnteredRef.current = false;
    drawerCloseConsumedRef.current = false;
    setDrawerEntered(false);
    clearDrawerCloseFallback();
    drawerCloseFallbackRef.current = setTimeout(() => {
      drawerCloseFallbackRef.current = null;
      if (drawerEnteredRef.current) return;
      if (drawerCloseConsumedRef.current) return;
      drawerCloseConsumedRef.current = true;
      finishDrawerUnmount();
    }, 300);
  }, [drawerMounted, finishDrawerUnmount, clearDrawerCloseFallback]);

  const handleDrawerTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget) return;
      if (drawerEnteredRef.current) return;
      if (e.propertyName !== "opacity") return;
      if (drawerCloseConsumedRef.current) return;
      drawerCloseConsumedRef.current = true;
      finishDrawerUnmount();
    },
    [finishDrawerUnmount],
  );

  useEffect(() => {
    if (!drawerMounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") beginCloseDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerMounted, beginCloseDrawer]);

  useEffect(() => {
    if (!drawerMounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerMounted]);

  useEffect(() => {
    return () => {
      if (drawerCloseFallbackRef.current != null) {
        clearTimeout(drawerCloseFallbackRef.current);
      }
    };
  }, []);

  const openModal = () => {
    setDraft({
      ...summary,
      quality: sanitizeDecimalNumberString(summary.quality),
      price: sanitizeDecimalNumberString(summary.price),
      actual: sanitizeDecimalNumberString(summary.actual),
    });
    setError(null);
    setOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setOpen(false);
    setError(null);
  };

  const openEditFromDrawer = () => {
    afterDrawerCloseRef.current = () => {
      openModal();
    };
    beginCloseDrawer();
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/session", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summaryProject: draft }),
      });
      if (!res.ok) throw new Error("save failed");
      const next = (await res.json()) as SessionPayload;
      onSaved(next);
      setOpen(false);
    } catch {
      setError(t("saveSummaryFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="rounded-[18px] border border-[color-mix(in_oklab,var(--ceremony-primary)_24%,var(--ceremony-border))] bg-(--ceremony-surface-2) shadow-[0_10px_28px_-22px_oklch(0.25_0.04_255/0.35)] transition hover:border-(--ceremony-primary) hover:bg-(--ceremony-surface)">
        <div className="flex items-start justify-between gap-2 px-3 pt-2">
          <p className="min-w-0 flex-1 text-[12px] font-black uppercase tracking-[0.08em] text-(--ceremony-primary)">
            {t("summaryProject")}
          </p>
          <button
            type="button"
            onClick={openDrawer}
            className="grid size-9 shrink-0 place-items-center rounded-full text-(--ceremony-muted) transition hover:bg-[color-mix(in_oklab,var(--ceremony-primary)_10%,var(--ceremony-surface-2))] hover:text-(--ceremony-primary) focus-visible:ring-4 focus-visible:ring-[color-mix(in_oklab,var(--ceremony-ring)_18%,transparent)]"
            aria-label={t("summaryProjectOpenDrawer")}
            aria-expanded={drawerMounted && drawerEntered}
            aria-haspopup="dialog"
          >
            <ZoomIn className="size-5" strokeWidth={2.25} aria-hidden />
          </button>
        </div>
        <button
          type="button"
          onClick={openModal}
          className="w-full px-3 pb-2.5 pt-0.5 text-left transition hover:bg-[color-mix(in_oklab,var(--ceremony-primary)_6%,transparent)] focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[color-mix(in_oklab,var(--ceremony-ring)_18%,transparent)]"
        >
          <dl className="mt-1 grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1 text-xs">
            {summaryFields.map((field) => (
              <div key={field.key} className="contents">
                <dt className="font-black text-(--ceremony-muted)">{field.label}:</dt>
                <dd
                  className="justify-self-start truncate rounded-md px-1.5 py-0.5 font-extrabold tabular-nums tracking-tight"
                  style={{
                    color: `var(${field.accentVar})`,
                    backgroundColor: `var(${field.accentSoftVar})`,
                  }}
                >
                  {displaySummaryValue(field.key, summary[field.key], language)}
                </dd>
              </div>
            ))}
          </dl>
        </button>
      </div>

      {drawerMounted ? (
        <div
          className="fixed inset-0 z-[88] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="summary-project-drawer-title"
        >
          <div
            className={`absolute inset-0 bg-[oklch(0.17_0.03_255/0.54)] backdrop-blur-[2px] transition-opacity duration-220 ease-in-out ${
              drawerEntered ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
            }`}
            aria-hidden
            onClick={beginCloseDrawer}
          />
          <div
            onTransitionEnd={handleDrawerTransitionEnd}
            onClick={(e) => e.stopPropagation()}
            className={`relative z-10 flex max-h-[min(92vh,880px)] w-full max-w-[min(100vw-2rem,50rem)] flex-col overflow-hidden rounded-[24px] border border-(--ceremony-border) bg-(--ceremony-surface) shadow-2xl transition-opacity duration-220 ease-in-out will-change-opacity ${
              drawerEntered ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 rounded-t-[24px] border-b border-(--ceremony-border) bg-(--ceremony-surface-2) px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <h2
                  id="summary-project-drawer-title"
                  className="text-xl font-black tracking-[-0.03em] text-(--ceremony-ink) sm:text-2xl"
                >
                  {t("summaryProject")}
                </h2>
              </div>
              <button
                type="button"
                onClick={beginCloseDrawer}
                className="grid size-10 shrink-0 place-items-center rounded-full text-(--ceremony-muted) transition hover:bg-(--ceremony-surface) hover:text-(--ceremony-ink)"
                aria-label={t("close")}
              >
                <X className="size-5" strokeWidth={2.25} aria-hidden />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              <div className="grid gap-4 sm:grid-cols-2 sm:gap-4">
                {summaryFields.map((field) => (
                  <section
                    key={field.key}
                    className="rounded-2xl border border-(--ceremony-border) bg-(--ceremony-surface-2) p-4 sm:p-5"
                  >
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-(--ceremony-muted)">
                      {t(field.key)}
                    </p>
                    <p
                      className="mt-3 break-words text-3xl font-black leading-none tracking-[-0.04em] tabular-nums sm:text-4xl"
                      style={{ color: `var(${field.accentVar})` }}
                    >
                      {displaySummaryValue(field.key, summary[field.key], language)}
                    </p>
                  </section>
                ))}
              </div>
            </div>

            <div className="shrink-0 rounded-b-[24px] border-t border-(--ceremony-border) bg-(--ceremony-surface-2) px-4 py-4 sm:px-6">
              <button
                type="button"
                onClick={openEditFromDrawer}
                className="w-full min-h-11 rounded-2xl bg-(--ceremony-primary) px-4 text-sm font-black text-(--ceremony-primary-ink) transition hover:opacity-95"
              >
                {t("summaryProjectEditFromDrawer")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-[oklch(0.17_0.03_255/0.54)] p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="summary-project-title"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-lg overflow-visible rounded-[24px] border border-(--ceremony-border) bg-(--ceremony-surface) shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 rounded-t-[24px] border-b border-(--ceremony-border) bg-(--ceremony-surface-2) px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-(--ceremony-primary)">
                  {t("projectInformation")}
                </p>
                <h2 id="summary-project-title" className="mt-1 text-xl font-black tracking-[-0.03em]">
                  {t("editSummaryProject")}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-(--ceremony-muted) hover:bg-(--ceremony-surface)"
                aria-label="ปิด"
              >
                <X className="size-5" strokeWidth={2.25} aria-hidden />
              </button>
            </div>

            <div className="grid gap-4 px-5 py-5">
              {inputFields.map((field) => (
                <label key={field.key} className="grid gap-1.5 text-sm">
                  <span className="font-black text-(--ceremony-muted)">{t(field.key)}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={draft[field.key]}
                    onChange={(e) =>
                      setDraft((current) => ({
                        ...current,
                        [field.key]: sanitizeDecimalNumberString(e.target.value),
                      }))
                    }
                    className="min-h-11 rounded-2xl border border-(--ceremony-border) bg-(--ceremony-surface-2) px-4 py-2 text-base font-bold tabular-nums outline-none transition focus:border-(--ceremony-ring) focus:bg-(--ceremony-surface) focus:ring-4 focus:ring-[color-mix(in_oklab,var(--ceremony-ring)_16%,transparent)]"
                    placeholder={t(
                      field.key === "quality"
                        ? "qualityPlaceholder"
                        : field.key === "price"
                          ? "pricePlaceholder"
                          : "actualPlaceholder",
                    )}
                  />
                </label>
              ))}

              <DateSelect
                label={t("delivery")}
                value={draft.delivery}
                placement="top"
                onChange={(delivery) => setDraft((current) => ({ ...current, delivery }))}
              />

              {error ? (
                <p className="rounded-2xl bg-(--ceremony-danger-soft) px-4 py-3 text-sm font-medium text-(--ceremony-danger)">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 border-t border-(--ceremony-border) px-5 py-4">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="min-h-10 rounded-full px-4 text-sm font-bold text-(--ceremony-muted) hover:bg-(--ceremony-surface-2) disabled:opacity-50"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="min-h-10 rounded-full bg-(--ceremony-primary) px-5 text-sm font-black text-(--ceremony-primary-ink) hover:opacity-90 disabled:opacity-50"
              >
                {saving ? t("saving") : t("save")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

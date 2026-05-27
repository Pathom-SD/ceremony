"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  useAppPreferences,
  type AppLanguage,
} from "./app-preferences";

const thaiMonths = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const weekDays = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const weekDaysEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value: string) {
  if (!isIsoDate(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatLocalizedDate(
  value: string,
  language: AppLanguage,
  fallback = "-",
) {
  const date = parseIsoDate(value);
  if (!date) return value.trim() || fallback;
  if (language === "en") {
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  }
  return `${date.getDate()} ${thaiMonths[date.getMonth()]} ${date.getFullYear() + 543}`;
}

type DateSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placement?: "top" | "bottom";
  compact?: boolean;
};

export function DateSelect({ label, value, onChange, placement = "bottom", compact = false }: DateSelectProps) {
  const { language, t } = useAppPreferences();
  const selectedDate = parseIsoDate(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => selectedDate ?? new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const days = useMemo(() => {
    const startDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return [
      ...Array.from({ length: startDay }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ];
  }, [month, year]);

  const shiftMonth = (offset: number) => {
    setViewDate((current) => {
      const next = new Date(current);
      next.setMonth(current.getMonth() + offset);
      return next;
    });
  };

  const pickDate = (day: number) => {
    onChange(toIsoDate(new Date(year, month, day)));
    setOpen(false);
  };

  const today = new Date();
  const todayIso = toIsoDate(today);
  const popupPosition = placement === "top" ? "bottom-[calc(100%+0.5rem)]" : "top-[calc(100%+0.5rem)]";
  const currentMonthLabel =
    language === "th"
      ? `${thaiMonths[month]} ${year + 543}`
      : `${new Intl.DateTimeFormat("en-US", { month: "long" }).format(
          new Date(year, month, 1),
        )} ${year}`;
  const daysOfWeek = language === "th" ? weekDays : weekDaysEn;

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!containerRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick, true);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick, true);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`grid gap-1 ${compact ? "text-xs" : "text-sm"}`}>
      <span className="font-black text-(--ceremony-muted)">{label}</span>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className={`flex w-full items-center justify-between rounded-2xl border border-(--ceremony-border) bg-(--ceremony-surface-2) text-left outline-none transition hover:bg-(--ceremony-surface) focus:border-(--ceremony-ring) focus:ring-4 focus:ring-[color-mix(in_oklab,var(--ceremony-ring)_16%,transparent)] ${
            compact ? "min-h-9 px-3 py-1.5" : "min-h-12 px-4 py-2"
          }`}
        >
          <span className="min-w-0">
            {!compact ? (
              <span className="block text-xs font-black uppercase tracking-[0.12em] text-(--ceremony-primary)">
                {t("selectDate")}
              </span>
            ) : null}
            <span
              className={`block truncate font-black text-foreground ${compact ? "text-sm" : "text-base"}`}
            >
              {formatLocalizedDate(value, language)}
            </span>
          </span>
        </button>

        {open ? (
          <div
            className={`absolute left-0 z-80 w-full min-w-[320px] rounded-[22px] border border-(--ceremony-border) bg-(--ceremony-surface) p-3 shadow-2xl ${popupPosition}`}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="grid size-9 place-items-center rounded-full font-black text-(--ceremony-muted) hover:bg-(--ceremony-surface-2)"
                aria-label="เดือนก่อนหน้า"
              >
                ‹
              </button>
              <p className="text-center text-sm font-black tracking-[-0.01em]">
                {currentMonthLabel}
              </p>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="grid size-9 place-items-center rounded-full font-black text-(--ceremony-muted) hover:bg-(--ceremony-surface-2)"
                aria-label="เดือนถัดไป"
              >
                ›
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {daysOfWeek.map((day) => (
                <span key={day} className="py-1 text-[11px] font-black text-(--ceremony-muted)">
                  {day}
                </span>
              ))}
              {days.map((day, index) =>
                day ? (
                  <button
                    key={`${year}-${month}-${day}`}
                    type="button"
                    onClick={() => pickDate(day)}
                    className={`grid aspect-square place-items-center rounded-xl text-sm font-black transition ${
                      toIsoDate(new Date(year, month, day)) === value
                        ? "bg-(--ceremony-primary) text-(--ceremony-primary-ink)"
                        : toIsoDate(new Date(year, month, day)) === todayIso
                          ? "bg-(--ceremony-primary-soft) text-(--ceremony-primary)"
                          : "text-foreground hover:bg-(--ceremony-surface-2)"
                    }`}
                  >
                    {day}
                  </button>
                ) : (
                  <span key={`blank-${index}`} />
                ),
              )}
            </div>

            <div className="mt-3 flex justify-between gap-2 border-t border-(--ceremony-border) pt-3">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="min-h-9 rounded-full px-3 text-xs font-black text-(--ceremony-muted) hover:bg-(--ceremony-surface-2)"
              >
                {t("clear")}
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(todayIso);
                  setViewDate(today);
                  setOpen(false);
                }}
                className="min-h-9 rounded-full bg-(--ceremony-primary-soft) px-3 text-xs font-black text-(--ceremony-primary) hover:opacity-90"
              >
                {t("today")}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

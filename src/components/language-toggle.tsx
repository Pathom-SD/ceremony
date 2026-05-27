"use client";

import "./language-toggle.css";

type LanguageToggleProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  "aria-label": string;
};

export function LanguageToggle({
  checked,
  onCheckedChange,
  "aria-label": ariaLabel,
}: LanguageToggleProps) {
  return (
    <label className="language-switch language-switch--preference">
      <input
        type="checkbox"
        role="switch"
        className="language-switch__checkbox"
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
        aria-label={ariaLabel}
      />
      <span className="language-switch__track" aria-hidden>
        <span className="language-switch__thumb" />
        <span className="language-switch__label language-switch__label--th">TH</span>
        <span className="language-switch__label language-switch__label--en">EN</span>
      </span>
    </label>
  );
}

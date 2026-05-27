import { fireEvent, render, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { AppPreferencesProvider, PreferenceControls } from "./app-preferences";

describe("PreferenceControls", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it("shows the animated day/night theme switch instead of LT/DK pills", () => {
    const { container, queryByText } = render(
      <AppPreferencesProvider>
        <PreferenceControls />
      </AppPreferencesProvider>,
    );

    expect(container.querySelector(".theme-switch")).toBeTruthy();
    expect(queryByText("LT")).toBeNull();
    expect(queryByText("DK")).toBeNull();
  });

  it("shows a styled language switch with TH and EN labels", () => {
    const { container } = render(
      <AppPreferencesProvider>
        <PreferenceControls />
      </AppPreferencesProvider>,
    );

    const languageSwitch = container.querySelector(".language-switch");
    expect(languageSwitch).toBeTruthy();
    expect(container.querySelector('button[role="switch"]')).toBeNull();
    expect(within(languageSwitch as HTMLElement).getByText("TH")).toBeTruthy();
    expect(within(languageSwitch as HTMLElement).getByText("EN")).toBeTruthy();
  });

  it("sizes the language switch to match the theme toggle footprint", () => {
    const { container } = render(
      <AppPreferencesProvider>
        <PreferenceControls />
      </AppPreferencesProvider>,
    );

    const languageRoot = container.querySelector(".language-switch");
    const themeRoot = container.querySelector(".theme-switch");
    const languageTrack = container.querySelector(".language-switch__track");
    const themeTrack = container.querySelector(".theme-switch__container");

    expect(languageRoot).toBeTruthy();
    expect(themeRoot).toBeTruthy();
    expect(languageTrack).toBeTruthy();
    expect(themeTrack).toBeTruthy();

    const languageOuter = languageRoot!.getBoundingClientRect();
    const themeOuter = themeRoot!.getBoundingClientRect();
    const languageInner = languageTrack!.getBoundingClientRect();
    const themeInner = themeTrack!.getBoundingClientRect();

    expect(Math.abs(themeOuter.width - languageOuter.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(themeOuter.height - languageOuter.height)).toBeLessThanOrEqual(1);
    expect(Math.abs(themeInner.width - languageInner.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(themeInner.height - languageInner.height)).toBeLessThanOrEqual(1);
  });

  it("toggles ceremony language when the language switch is used", async () => {
    render(
      <AppPreferencesProvider>
        <PreferenceControls />
      </AppPreferencesProvider>,
    );

    const toggle = document.querySelector(
      ".language-switch__checkbox",
    ) as HTMLInputElement;

    expect(toggle.checked).toBe(false);
    expect(document.documentElement.lang).toBe("th");

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(toggle.checked).toBe(true);
      expect(document.documentElement.lang).toBe("en");
      expect(localStorage.getItem("ceremony-language")).toBe("en");
    });
  });

  it("toggles ceremony theme when the switch is used", async () => {
    render(
      <AppPreferencesProvider>
        <PreferenceControls />
      </AppPreferencesProvider>,
    );

    const toggle = document.querySelector(
      ".theme-switch__checkbox",
    ) as HTMLInputElement;

    expect(toggle.checked).toBe(false);
    expect(document.documentElement.dataset.theme).toBe("light");

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(toggle.checked).toBe(true);
      expect(document.documentElement.dataset.theme).toBe("dark");
      expect(localStorage.getItem("ceremony-theme")).toBe("dark");
    });
  });
});

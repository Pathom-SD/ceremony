import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VideoLibraryMini } from "./video-library-mini";

vi.mock("./app-preferences", () => ({
  useAppPreferences: () => ({
    t: (key: string) => key,
  }),
}));

describe("VideoLibraryMini", () => {
  it("places the video library toggle button at top-right", () => {
    const { container } = render(
      <VideoLibraryMini
        topicId="ceremony-videos"
        files={[]}
        onRefresh={() => undefined}
      />,
    );

    const toggleBtn = container.querySelector('button[aria-label="toggleVideoPanel"]');
    expect(toggleBtn).not.toBeNull();
    expect(toggleBtn?.className).toContain("fixed");
    expect(toggleBtn?.className).toContain("top-4");
    expect(toggleBtn?.className).toContain("right-4");
    expect(toggleBtn?.className).not.toContain("bottom-5");
  });

  it("opens video library as right side sheet", () => {
    const { container } = render(
      <VideoLibraryMini
        topicId="ceremony-videos"
        files={[]}
        onRefresh={() => undefined}
      />,
    );

    const toggleBtn = container.querySelector('button[aria-label="toggleVideoPanel"]');
    expect(toggleBtn).not.toBeNull();
    fireEvent.click(toggleBtn!);

    const panel = container.querySelector('div[role="dialog"][aria-label="videoLibrary"]');
    expect(panel).not.toBeNull();
    expect(panel?.className).toContain("top-0");
    expect(panel?.className).toContain("right-0");
    expect(panel?.className).toContain("h-dvh");
    expect(panel?.className).not.toContain("bottom-[4.75rem]");
  });

  it("keeps the video toggle below topic and confirm modal backdrops", () => {
    const { container } = render(
      <VideoLibraryMini
        topicId="ceremony-videos"
        files={[]}
        onRefresh={() => undefined}
      />,
    );

    const toggleBtn = container.querySelector('button[aria-label="toggleVideoPanel"]');
    expect(toggleBtn).not.toBeNull();
    // TopicModal overlay is z-50; clear/summary backdrops are z-70
    expect(toggleBtn?.className).toContain("z-40");
    expect(toggleBtn?.className).not.toMatch(/z-\[(5\d|[6-9]\d|\d{3,})\]/);
  });

  it("keeps the toggle button behind the sheet and animates slide-in from the right", () => {
    const { container } = render(
      <VideoLibraryMini
        topicId="ceremony-videos"
        files={[]}
        onRefresh={() => undefined}
      />,
    );

    const toggleBtn = container.querySelector('button[aria-label="toggleVideoPanel"]');
    expect(toggleBtn).not.toBeNull();
    fireEvent.click(toggleBtn!);

    const panel = container.querySelector('div[role="dialog"][aria-label="videoLibrary"]');
    expect(panel).not.toBeNull();
    expect(panel?.className).toContain("transition-transform");
    // initial render starts off-screen, then transitions to on-screen
    expect(panel?.className).toContain("translate-x-full");

    // button stays below the sheet (z-90) and modal overlays (z-50+)
    expect(toggleBtn?.className).toContain("z-40");
    expect(panel?.className).toContain("z-[90]");
  });

  it("does not refresh files on every open/close", () => {
    const onRefresh = vi.fn();
    const { container } = render(
      <VideoLibraryMini
        topicId="ceremony-videos"
        files={[]}
        onRefresh={onRefresh}
      />,
    );

    const toggleBtn = container.querySelector('button[aria-label="toggleVideoPanel"]');
    expect(toggleBtn).not.toBeNull();

    fireEvent.click(toggleBtn!); // open
    fireEvent.click(toggleBtn!); // close
    fireEvent.click(toggleBtn!); // open again

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("keeps the sheet mounted after closing to avoid remount reloads", () => {
    const { container } = render(
      <VideoLibraryMini
        topicId="ceremony-videos"
        files={[]}
        onRefresh={() => undefined}
      />,
    );

    const toggleBtn = container.querySelector('button[aria-label="toggleVideoPanel"]');
    expect(toggleBtn).not.toBeNull();

    fireEvent.click(toggleBtn!); // open
    const panel = container.querySelector('div[role="dialog"][aria-label="videoLibrary"]');
    expect(panel).not.toBeNull();

    fireEvent.click(toggleBtn!); // close
    const panelAfterClose = container.querySelector('div[role="dialog"][aria-label="videoLibrary"]');
    expect(panelAfterClose).not.toBeNull();
  });

  it("can reopen with a single click after closing via the sheet close button", () => {
    const { container } = render(
      <VideoLibraryMini
        topicId="ceremony-videos"
        files={[]}
        onRefresh={() => undefined}
      />,
    );

    const toggleBtn = container.querySelector('button[aria-label="toggleVideoPanel"]');
    expect(toggleBtn).not.toBeNull();
    fireEvent.click(toggleBtn!); // open

    const closeBtn = container.querySelector('button[aria-label="close"]');
    expect(closeBtn).not.toBeNull();
    fireEvent.click(closeBtn!); // close via sheet X

    // single click should open again
    fireEvent.click(toggleBtn!);
    const panel = container.querySelector('div[role="dialog"][aria-label="videoLibrary"]');
    expect(panel).not.toBeNull();
    expect(panel?.getAttribute("aria-hidden")).toBe("false");
  });
});


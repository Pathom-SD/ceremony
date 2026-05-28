import { render, fireEvent } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { StoredFileRecord } from "@/lib/file-types";
import { CeremonyVideoPlayer } from "./ceremony-video-player";

vi.mock("./app-preferences", () => ({
  useAppPreferences: () => ({
    t: (key: string) => key,
  }),
}));

const sampleFile: StoredFileRecord = {
  id: "vid-1",
  topicId: "ceremony-videos",
  originalName: "opening.mp4",
  ext: ".mp4",
  mime: "video/mp4",
  size: 1024,
  uploadedAt: new Date().toISOString(),
};

describe("CeremonyVideoPlayer", () => {
  let fullscreenElementMock: Element | null = null;

  beforeAll(() => {
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    HTMLMediaElement.prototype.pause = vi.fn();
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => fullscreenElementMock,
    });
    Document.prototype.exitFullscreen = vi.fn(() => {
      fullscreenElementMock = null;
      document.dispatchEvent(new Event("fullscreenchange"));
      return Promise.resolve();
    });
  });

  it("keeps volume control visible on narrow viewports", () => {
    const { container } = render(
      <CeremonyVideoPlayer
        file={sampleFile}
        src="/api/files/vid-1?preview=1"
        onClose={() => undefined}
      />,
    );

    const volume = container.querySelector(".video-volume");
    expect(volume).not.toBeNull();
    expect(volume?.className).not.toContain("hidden");
  });

  it("closes from the backdrop without a close button in the control bar", () => {
    const onClose = vi.fn();
    const { container } = render(
      <CeremonyVideoPlayer
        file={sampleFile}
        src="/api/files/vid-1?preview=1"
        onClose={onClose}
      />,
    );

    const controls = container.querySelector("[data-video-player-controls]");
    expect(controls).not.toBeNull();
    expect(controls?.querySelector('button[aria-label="close"]')).toBeNull();

    const backdrop = container.querySelector("[data-video-player-backdrop]");
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders a dark scrim behind the centered player", () => {
    const { container } = render(
      <CeremonyVideoPlayer
        file={sampleFile}
        src="/api/files/vid-1?preview=1"
        onClose={() => undefined}
      />,
    );

    const backdrop = container.querySelector("[data-video-player-backdrop]");
    expect(backdrop).not.toBeNull();
    expect(backdrop?.className).toContain("bg-[oklch(0.08_0.02_255/0.82)]");
    expect(backdrop?.className).toContain("backdrop-blur-[3px]");

    const shell = container.querySelector("[data-video-player-shell]");
    expect(shell).not.toBeNull();
    expect(shell?.className).toContain("max-w-[min(92vw,72rem)]");
  });

  it("hides bottom controls after 3 seconds without mouse movement while playing", async () => {
    const { container } = render(
      <CeremonyVideoPlayer
        file={sampleFile}
        src="/api/files/vid-1?preview=1"
        onClose={() => undefined}
      />,
    );

    const video = container.querySelector("video");
    expect(video).not.toBeNull();

    const controls = container.querySelector("[data-video-player-controls]");
    expect(controls).not.toBeNull();

    // start playing
    fireEvent.play(video!);
    expect(controls?.className).toContain("opacity-100");

    await new Promise((r) => setTimeout(r, 3100));
    expect(controls?.className).toContain("opacity-0");
  });

  it("shows loading indicator until the video can play", () => {
    const { container } = render(
      <CeremonyVideoPlayer
        file={sampleFile}
        src="/api/files/vid-1?preview=1"
        onClose={() => undefined}
      />,
    );

    const loading = container.querySelector("[data-video-player-loading]");
    expect(loading).not.toBeNull();
    expect(loading?.textContent).toContain("loadingVideo");

    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    fireEvent.canPlay(video!);

    expect(container.querySelector("[data-video-player-loading]")).toBeNull();
  });

  it("expands player shell to true full screen when entering fullscreen mode", async () => {
    const { container } = render(
      <CeremonyVideoPlayer
        file={sampleFile}
        src="/api/files/vid-1?preview=1"
        onClose={() => undefined}
      />,
    );

    const shell = container.querySelector("[data-video-player-shell]");
    expect(shell).not.toBeNull();
    expect(shell?.className).not.toContain("max-w-none");
    Object.assign(shell!, {
      requestFullscreen: vi.fn(() => {
        fullscreenElementMock = shell;
        document.dispatchEvent(new Event("fullscreenchange"));
        return Promise.resolve();
      }),
    });
    const fullscreenBtn = container.querySelector('button[aria-label="videoFullscreen"]');
    expect(fullscreenBtn).not.toBeNull();
    fireEvent.click(fullscreenBtn!);
    await new Promise((r) => setTimeout(r, 0));

    expect(shell?.className).toContain("max-w-none");
    expect(shell?.className).toContain("w-screen");
    expect(shell?.className).toContain("h-screen");
  });

  it("toggles loop mode for the current player session", () => {
    const { container } = render(
      <CeremonyVideoPlayer
        file={sampleFile}
        src="/api/files/vid-1?preview=1"
        onClose={() => undefined}
      />,
    );

    const video = container.querySelector("video") as HTMLVideoElement | null;
    expect(video).not.toBeNull();
    expect(video?.loop).toBe(false);

    const loopBtn = container.querySelector('button[aria-label="videoLoop"]');
    expect(loopBtn).not.toBeNull();
    fireEvent.click(loopBtn!);
    expect(video?.loop).toBe(true);
    fireEvent.click(loopBtn!);
    expect(video?.loop).toBe(false);
  });

  it("changes playback speed from standard options", () => {
    const { container } = render(
      <CeremonyVideoPlayer
        file={sampleFile}
        src="/api/files/vid-1?preview=1"
        onClose={() => undefined}
      />,
    );

    const video = container.querySelector("video") as HTMLVideoElement | null;
    expect(video).not.toBeNull();
    expect(video?.playbackRate).toBe(1);

    const speedSelect = container.querySelector(
      'select[aria-label="videoPlaybackSpeed"]',
    ) as HTMLSelectElement | null;
    expect(speedSelect).not.toBeNull();

    fireEvent.change(speedSelect!, { target: { value: "1.5" } });
    expect(video?.playbackRate).toBe(1.5);
    expect(speedSelect?.value).toBe("1.5");
  });
});


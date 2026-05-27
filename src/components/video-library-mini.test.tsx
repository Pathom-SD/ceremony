import { fireEvent, render, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { startFormUpload } from "@/lib/form-upload";
import { VideoLibraryMini } from "./video-library-mini";

vi.mock("@/lib/form-upload", () => ({
  UPLOAD_ABORTED: "UPLOAD_ABORTED",
  startFormUpload: vi.fn(),
}));

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

  it("shows cancel during upload and aborts the in-flight request", async () => {
    const abort = vi.fn();
    vi.mocked(startFormUpload).mockReturnValue({
      promise: new Promise(() => undefined),
      abort,
    });

    const { container } = render(
      <VideoLibraryMini
        topicId="ceremony-videos"
        files={[]}
        onRefresh={() => undefined}
      />,
    );

    fireEvent.click(container.querySelector('button[aria-label="toggleVideoPanel"]')!);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "clip.mp4", { type: "video/mp4" });
    fireEvent.change(input, { target: { files: [file] } });

    const cancelBtn = await waitFor(() =>
      container.querySelector('button[aria-label="cancelUpload"]'),
    );
    expect(cancelBtn).not.toBeNull();
    fireEvent.click(cancelBtn!);
    expect(abort).toHaveBeenCalled();
  });

  it("keeps the menu open on more-button mousedown so the following click can toggle closed", () => {
    const files = [
      {
        id: "v1",
        topicId: "ceremony-videos",
        originalName: "clip.mp4",
        ext: ".mp4",
        mime: "video/mp4",
        size: 100,
        uploadedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    const { container } = render(
      <VideoLibraryMini topicId="ceremony-videos" files={files} onRefresh={() => undefined} />,
    );

    fireEvent.click(container.querySelector('button[aria-label="toggleVideoPanel"]')!);

    const moreBtn = container.querySelector('button[aria-label="moreActions"]');
    expect(moreBtn).not.toBeNull();

    fireEvent.click(moreBtn!);
    expect(container.querySelector('[role="menu"]')).not.toBeNull();

    fireEvent.mouseDown(moreBtn!);
    expect(container.querySelector('[role="menu"]')).not.toBeNull();

    fireEvent.click(moreBtn!);
    expect(container.querySelector('[role="menu"]')).toBeNull();
  });

  it("toggles the more menu when clicking the same more button again", () => {
    const files = [
      {
        id: "v1",
        topicId: "ceremony-videos",
        originalName: "clip.mp4",
        ext: ".mp4",
        mime: "video/mp4",
        size: 100,
        uploadedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    const { container } = render(
      <VideoLibraryMini topicId="ceremony-videos" files={files} onRefresh={() => undefined} />,
    );

    fireEvent.click(container.querySelector('button[aria-label="toggleVideoPanel"]')!);

    const moreBtn = container.querySelector('button[aria-label="moreActions"]');
    expect(moreBtn).not.toBeNull();

    fireEvent.click(moreBtn!);
    expect(container.querySelector('[role="menu"]')).not.toBeNull();

    fireEvent.click(moreBtn!);
    expect(container.querySelector('[role="menu"]')).toBeNull();

    fireEvent.click(moreBtn!);
    expect(container.querySelector('[role="menu"]')).not.toBeNull();
  });

  it("closes the more menu when clicking elsewhere in the video panel", () => {
    const files = [
      {
        id: "v1",
        topicId: "ceremony-videos",
        originalName: "clip.mp4",
        ext: ".mp4",
        mime: "video/mp4",
        size: 100,
        uploadedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    const { container } = render(
      <VideoLibraryMini topicId="ceremony-videos" files={files} onRefresh={() => undefined} />,
    );

    fireEvent.click(container.querySelector('button[aria-label="toggleVideoPanel"]')!);

    const moreBtn = container.querySelector('button[aria-label="moreActions"]');
    expect(moreBtn).not.toBeNull();
    fireEvent.click(moreBtn!);
    expect(container.querySelector('[role="menu"]')).not.toBeNull();

    const panel = container.querySelector('div[role="dialog"][aria-label="videoLibrary"]');
    expect(panel).not.toBeNull();
    fireEvent.mouseDown(panel!);

    expect(container.querySelector('[role="menu"]')).toBeNull();
  });

  it("shows a confirm dialog instead of window.confirm when deleting a video", async () => {
    const confirmSpy = vi.fn(() => true);
    vi.stubGlobal("confirm", confirmSpy);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const files = [
      {
        id: "v1",
        topicId: "ceremony-videos",
        originalName: "clip.mp4",
        ext: ".mp4",
        mime: "video/mp4",
        size: 100,
        uploadedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    const { container } = render(
      <VideoLibraryMini topicId="ceremony-videos" files={files} onRefresh={() => undefined} />,
    );

    fireEvent.click(container.querySelector('button[aria-label="toggleVideoPanel"]')!);
    fireEvent.click(container.querySelector('button[aria-label="moreActions"]')!);

    const removeItem = container.querySelectorAll('[role="menuitem"]')[1];
    expect(removeItem).not.toBeNull();
    fireEvent.click(removeItem!);

    expect(confirmSpy).not.toHaveBeenCalled();
    const deleteDialog = container.querySelector('[aria-labelledby="delete-video-title"]');
    expect(deleteDialog).not.toBeNull();
    expect(within(deleteDialog as HTMLElement).getByText("confirmDeleteVideo")).toBeTruthy();

    fireEvent.click(within(deleteDialog as HTMLElement).getByText("cancel"));
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(container.querySelector('button[aria-label="moreActions"]')!);
    fireEvent.click(container.querySelectorAll('[role="menuitem"]')[1]!);
    const deleteDialogAgain = container.querySelector('[aria-labelledby="delete-video-title"]');
    fireEvent.click(within(deleteDialogAgain as HTMLElement).getByText("confirmDeleteVideoAction"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/topics/ceremony-videos/files/v1", {
        method: "DELETE",
      });
    });
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


import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SessionPayload } from "@/lib/session-types";
import { CeremonyApp } from "./ceremony-app";

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

vi.mock("./app-preferences", () => ({
  useAppPreferences: () => ({
    t: (key: string) => key,
  }),
  PreferenceControls: () => null,
}));

vi.mock("./topic-modal", () => ({
  TopicModal: () => null,
}));

vi.mock("./file-preview-overlay", () => ({
  FilePreviewOverlay: () => null,
}));

vi.mock("./video-library-mini", () => ({
  VideoLibraryMini: () => null,
}));

const emptySession: SessionPayload = {
  projectName: "",
  projectNo: "",
  customer: "",
  ceremonyDate: "",
  summaryProject: {
    quality: "",
    price: "",
    actual: "",
    delivery: "",
  },
};

describe("CeremonyApp responsive layout", () => {
  it("scrolls the whole page on small screens instead of trapping scroll inside the board", () => {
    const { container } = render(
      <CeremonyApp initialSession={emptySession} initialFilesByTopic={{}} />,
    );

    const shell = container.querySelector("[data-ceremony-shell]");
    expect(shell).not.toBeNull();
    expect(shell?.className).toContain("overflow-y-auto");
    expect(shell?.className).toContain("xl:overflow-hidden");

    const board = container.querySelector("[data-ceremony-board]");
    expect(board).not.toBeNull();
    expect(board?.className).toContain("grid-cols-1");
    expect(board?.className).toContain("xl:grid-cols-5");
    expect(board?.className).not.toContain("overflow-y-auto");
  });

  it("stacks the header vertically on small screens", () => {
    const { container } = render(
      <CeremonyApp initialSession={emptySession} initialFilesByTopic={{}} />,
    );

    const header = container.querySelector("[data-ceremony-header]");
    expect(header).not.toBeNull();
    expect(header?.className).toContain("flex-col");
    expect(header?.className).toContain("xl:flex-row");
  });
});

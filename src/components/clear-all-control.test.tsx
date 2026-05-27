import { fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClearAllControl } from "./clear-all-control";

vi.mock("./app-preferences", () => ({
  useAppPreferences: () => ({
    t: (key: string) => key,
  }),
}));

describe("ClearAllControl", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      }),
    );
  });

  it("clears all data after a single confirmation dialog", async () => {
    const onCleared = vi.fn();
    const { getByText, queryByText } = render(
      <ClearAllControl onCleared={onCleared} />,
    );

    fireEvent.click(getByText("clearAll"));
    expect(queryByText("continue")).toBeNull();
    fireEvent.click(getByText("confirmDeleteAll"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/admin/clear", { method: "POST" });
      expect(onCleared).toHaveBeenCalled();
    });
  });
});

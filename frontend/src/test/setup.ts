import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  localStorage.clear();
  // Undo vi.spyOn (e.g. window.confirm) so one test's answers don't leak into the next.
  vi.restoreAllMocks();
});

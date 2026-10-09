import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// findBy/waitFor give up after 1s by default, which a busy machine can exceed.
configure({ asyncUtilTimeout: 3000 });

afterEach(() => {
  cleanup();
  localStorage.clear();
  // Undo vi.spyOn (e.g. window.confirm) so one test's answers don't leak into the next.
  vi.restoreAllMocks();
});

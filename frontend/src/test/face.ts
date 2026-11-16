import { fireEvent, screen } from "@testing-library/react";

/** Tap the face map at (x, y) in drawing units (it's 200 × 260). jsdom has no layout,
 * so the map is given a 200 × 260 box at the origin first. */
export function tapFace(x: number, y: number) {
  const svg = screen.getByRole("group", { name: /^Face map/ });
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 260 }) as DOMRect;
  fireEvent.click(screen.getByRole("button", { name: /^Add a pin/ }), { clientX: x, clientY: y });
}

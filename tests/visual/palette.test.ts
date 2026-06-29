import { describe, expect, it } from "vitest";
import { visualPalette } from "../../src/visual/palette";

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = hex.replace("#", "");
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  };
}

function luminance({ r, g, b }: { r: number; g: number; b: number }): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

describe("visualPalette", () => {
  it("uses a very dark background", () => {
    const rgb = hexToRgb(visualPalette.background);

    expect(luminance(rgb)).toBeLessThanOrEqual(20); // Very dark
  });
});

import fs from "node:fs";
import path from "node:path";
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

  it("keeps palette color channels below harsh full brightness", () => {
    const colorValues = collectColorStrings(visualPalette);
    const channels = colorValues.flatMap(color => parseColorChannels(color));

    expect(channels.length).toBeGreaterThan(0);
    expect(Math.max(...channels)).toBeLessThanOrEqual(230);
  });

  it("does not hard-code pure white in the canvas renderer", () => {
    const rendererPath = path.resolve(process.cwd(), "src/visual/CanvasRenderer.ts");
    const rendererSource = fs.readFileSync(rendererPath, "utf8");

    expect(rendererSource).not.toContain("#ffffff");
    expect(rendererSource).not.toContain("255, 255, 255");
  });
});

function collectColorStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(item => collectColorStrings(item));
  if (value && typeof value === "object") return Object.values(value).flatMap(item => collectColorStrings(item));
  return [];
}

function parseColorChannels(color: string): number[] {
  if (color.startsWith("#")) {
    const rgb = hexToRgb(color);
    return [rgb.r, rgb.g, rgb.b];
  }

  const rgbaMatch = color.match(/rgba?\(([^)]+)\)/);
  if (!rgbaMatch) return [];
  return rgbaMatch[1]
    .split(",")
    .slice(0, 3)
    .map(channel => Number.parseFloat(channel.trim()))
    .filter(channel => Number.isFinite(channel));
}

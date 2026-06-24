import { describe, expect, it } from "vitest";
import { createConstellationLinks } from "../../src/effects/constellation";
import { Anchor } from "../../src/effects/types";

function anchor(id: number, x: number, y: number, alpha = 0.5): Anchor {
  return { id, x, y, alpha, active: true, ageMs: 0, ttlMs: 5000, size: 8, color: "#8fa08a" };
}

describe("createConstellationLinks", () => {
  it("links nearby anchors and ignores distant anchors", () => {
    const links = createConstellationLinks([anchor(1, 0, 0), anchor(2, 60, 0), anchor(3, 500, 500)], {
      minDistance: 24,
      maxDistance: 180,
      maxLinks: 10
    });

    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({ fromId: 1, toId: 2 });
    expect(links[0].alpha).toBeGreaterThan(0);
  });

  it("respects the configured max link count", () => {
    const anchors = Array.from({ length: 12 }, (_, index) => anchor(index + 1, index * 20, 0));
    const links = createConstellationLinks(anchors, { minDistance: 0, maxDistance: 160, maxLinks: 5 });

    expect(links).toHaveLength(5);
  });

  it("does not link anchors that are too close", () => {
    const links = createConstellationLinks([anchor(1, 10, 10), anchor(2, 12, 12)], {
      minDistance: 24,
      maxDistance: 180,
      maxLinks: 10
    });

    expect(links).toHaveLength(0);
  });
});

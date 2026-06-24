import { Anchor } from "./types";

export type ConstellationLink = {
  fromId: number;
  toId: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
};

export type ConstellationOptions = {
  minDistance: number;
  maxDistance: number;
  maxLinks: number;
};

export function createConstellationLinks(
  anchors: readonly Anchor[],
  options: ConstellationOptions
): ConstellationLink[] {
  const links: ConstellationLink[] = [];

  for (let i = 0; i < anchors.length; i += 1) {
    for (let j = i + 1; j < anchors.length; j += 1) {
      if (links.length >= options.maxLinks) return links;

      const from = anchors[i];
      const to = anchors[j];
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.hypot(dx, dy);

      if (distance < options.minDistance || distance > options.maxDistance) continue;

      const distanceAlpha = 1 - (distance - options.minDistance) / (options.maxDistance - options.minDistance);
      links.push({
        fromId: from.id,
        toId: to.id,
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        alpha: Math.max(0, Math.min(from.alpha, to.alpha) * distanceAlpha * 0.42)
      });
    }
  }

  return links;
}

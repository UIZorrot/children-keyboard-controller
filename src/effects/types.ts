export type EffectKind = "circle" | "square" | "triangle" | "particle";

export type Effect = {
  id: number;
  kind: EffectKind;
  active: boolean;
  ageMs: number;
  ttlMs: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  alpha: number;
  color: string;
};

export const MAX_ACTIVE_SHAPES = 80;
export const MAX_ACTIVE_PARTICLES = 120;

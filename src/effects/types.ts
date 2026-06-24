export type EffectKind = "house" | "tree" | "hill" | "cloud" | "flower" | "leaf" | "pathStone" | "sparkle";
export type EffectRole = "ground" | "midground" | "sky" | "detail" | "sparkle";

export type Effect = {
  id: number;
  kind: EffectKind;
  role: EffectRole;
  active: boolean;
  ageMs: number;
  ttlMs: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  startSize: number;
  endSize: number;
  rotation: number;
  rotationSpeed: number;
  alpha: number;
  color: string;
  accentColor: string;
};

export type Anchor = {
  id: number;
  active: boolean;
  ageMs: number;
  ttlMs: number;
  x: number;
  y: number;
  size: number;
  alpha: number;
  color: string;
};

export const MAX_ACTIVE_SHAPES = 90;
export const MAX_ACTIVE_PARTICLES = 130;
export const MAX_ACTIVE_RIPPLES = 40;
export const MAX_ACTIVE_ANCHORS = 48;
export const MAX_CONSTELLATION_LINKS = 80;

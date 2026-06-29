export type EffectKind = "circle" | "square" | "triangle" | "star" | "heart" | "polygon" | "particle" | "ripple";
export type EffectRole = "primary" | "secondary" | "particle" | "ripple";

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

export const MAX_ACTIVE_SHAPES = 120;
export const MAX_ACTIVE_PARTICLES = 200;
export const MAX_ACTIVE_RIPPLES = 60;
export const MAX_ACTIVE_ANCHORS = 64;
export const MAX_CONSTELLATION_LINKS = 100;

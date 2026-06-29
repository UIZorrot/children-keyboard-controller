export type EffectKind = "circle" | "square" | "triangle" | "star" | "heart" | "polygon" | "diamond" | "particle" | "ripple";
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

// Lowered limits for better performance and to prevent screen clutter
export const MAX_ACTIVE_SHAPES = 45;
export const MAX_ACTIVE_PARTICLES = 80;
export const MAX_ACTIVE_RIPPLES = 30;
export const MAX_ACTIVE_ANCHORS = 40;
export const MAX_CONSTELLATION_LINKS = 60;

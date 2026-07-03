import { ObjectPool } from "./objectPool";
import {
  Anchor,
  Effect,
  EffectKind,
  MAX_ACTIVE_ANCHORS,
  MAX_ACTIVE_PARTICLES,
  MAX_ACTIVE_RIPPLES,
  MAX_ACTIVE_SHAPES
} from "./types";
import { visualPalette } from "../visual/palette";

type EngineOptions = {
  width: number;
  height: number;
  seed?: number;
};

const SHAPE_KINDS: EffectKind[] = ["circle", "square", "triangle", "star", "heart", "polygon", "diamond"];

export class EffectEngine {
  private nextId = 1;
  private width: number;
  private height: number;
  private seed: number;
  private readonly activeEffects: Effect[] = [];
  private readonly activeAnchors: Anchor[] = [];
  private readonly effectPool = new ObjectPool<Effect>(() => this.createEffect(), item => this.resetEffect(item));
  private readonly anchorPool = new ObjectPool<Anchor>(() => this.createAnchor(), item => this.resetAnchor(item));

  constructor(options: EngineOptions) {
    this.width = options.width;
    this.height = options.height;
    this.seed = options.seed ?? Date.now();
  }

  get effects(): readonly Effect[] {
    return this.activeEffects;
  }

  get anchors(): readonly Anchor[] {
    return this.activeAnchors;
  }

  get activeShapeCount(): number {
    return this.activeEffects.filter(effect => effect.role === "primary" || effect.role === "secondary").length;
  }

  get activeParticleCount(): number {
    return this.activeEffects.filter(effect => effect.role === "particle").length;
  }

  get activeRippleCount(): number {
    return this.activeEffects.filter(effect => effect.role === "ripple").length;
  }

  get activeAnchorCount(): number {
    return this.activeAnchors.length;
  }

  get inactiveShapePoolCount(): number {
    return this.effectPool.inactiveCount;
  }

  get inactiveParticlePoolCount(): number {
    return this.effectPool.inactiveCount;
  }

  get inactiveRipplePoolCount(): number {
    return this.effectPool.inactiveCount;
  }

  get inactiveAnchorPoolCount(): number {
    return this.anchorPool.inactiveCount;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  spawnForKey(code: string): void {
    // Spawns at a random position across the entire screen
    const x = this.width * (0.1 + this.random() * 0.8);
    const y = this.height * (0.1 + this.random() * 0.8);
    this.spawnBurst(x, y);
  }

  spawnForClick(x: number, y: number): void {
    this.spawnBurst(x, y);
  }

  private spawnBurst(x: number, y: number): void {
    this.spawnAnchor(x, y);
    this.spawnRipple(x, y);
    this.spawnShape(x, y, "primary");

    const secondaryCount = 1 + Math.floor(this.random() * 2);
    for (let i = 0; i < secondaryCount; i += 1) {
      this.spawnShape(x, y, "secondary");
    }

    const particleCount = 4 + Math.floor(this.random() * 6);
    for (let i = 0; i < particleCount; i += 1) {
      this.spawnParticle(x, y);
    }
  }

  update(deltaMs: number): void {
    this.updateEffects(deltaMs);
    this.updateAnchors(deltaMs);
  }

  private updateEffects(deltaMs: number): void {
    const seconds = deltaMs / 1000;

    // First pass: move and age
    for (let i = this.activeEffects.length - 1; i >= 0; i -= 1) {
      const effect = this.activeEffects[i];
      effect.ageMs += deltaMs;

      if (effect.ageMs >= effect.ttlMs) {
        this.activeEffects.splice(i, 1);
        this.effectPool.release(effect);
        continue;
      }

      const t = effect.ageMs / effect.ttlMs;
      const eased = 1 - Math.pow(1 - t, 3);
      effect.x += effect.vx * seconds;
      effect.y += effect.vy * seconds;
      effect.size = effect.startSize + (effect.endSize - effect.startSize) * eased;
      effect.rotation += effect.rotationSpeed * seconds;

      if (effect.role === "ripple") {
        effect.alpha = Math.max(0, 0.14 * (1 - t));
      } else {
        const appear = Math.min(1, t / 0.1);
        const fade = 1 - Math.max(0, t - 0.7) / 0.3;
        const maxAlpha = effect.role === "primary" ? 0.32 : effect.role === "secondary" ? 0.24 : 0.16;
        effect.alpha = Math.max(0, appear * fade * maxAlpha);

        // Screen boundary bounce for shapes
        if (effect.role === "primary" || effect.role === "secondary") {
          const radius = effect.size / 2;
          if (effect.x - radius < 0) {
            effect.x = radius;
            effect.vx *= -1;
          } else if (effect.x + radius > this.width) {
            effect.x = this.width - radius;
            effect.vx *= -1;
          }

          if (effect.y - radius < 0) {
            effect.y = radius;
            effect.vy *= -1;
          } else if (effect.y + radius > this.height) {
            effect.y = this.height - radius;
            effect.vy *= -1;
          }
        }
      }
    }

    // Second pass: physics collision between shapes
    const shapes = this.activeEffects.filter(e => e.role === "primary" || e.role === "secondary");
    for (let i = 0; i < shapes.length; i++) {
      for (let j = i + 1; j < shapes.length; j++) {
        const a = shapes[i];
        const b = shapes[j];

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        // Treat shapes roughly as circles for collision
        const minDist = (a.size + b.size) / 2 * 0.85; // 0.85 makes the bounding box a bit forgiving

        if (dist < minDist && dist > 0.01) {
          // Resolve overlap
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;

          // Push apart
          const pushX = nx * overlap * 0.5;
          const pushY = ny * overlap * 0.5;
          a.x -= pushX;
          a.y -= pushY;
          b.x += pushX;
          b.y += pushY;

          // Simple elastic collision (exchange velocity along normal)
          const kx = a.vx - b.vx;
          const ky = a.vy - b.vy;
          // Assume equal mass
          const p = nx * kx + ny * ky;
          a.vx -= p * nx;
          a.vy -= p * ny;
          b.vx += p * nx;
          b.vy += p * ny;
        }
      }
    }
  }

  private updateAnchors(deltaMs: number): void {
    for (let i = this.activeAnchors.length - 1; i >= 0; i -= 1) {
      const anchor = this.activeAnchors[i];
      anchor.ageMs += deltaMs;
      if (anchor.ageMs >= anchor.ttlMs) {
        this.activeAnchors.splice(i, 1);
        this.anchorPool.release(anchor);
        continue;
      }
      anchor.alpha = Math.max(0, 0.24 * (1 - anchor.ageMs / anchor.ttlMs));
    }
  }

  private spawnAnchor(x: number, y: number): void {
    if (this.activeAnchors.length >= MAX_ACTIVE_ANCHORS) return;
    const anchor = this.anchorPool.acquire();
    anchor.id = this.nextId++;
    anchor.active = true;
    anchor.ageMs = 0;
    anchor.ttlMs = 4000 + this.random() * 1000;
    anchor.x = x;
    anchor.y = y;
    anchor.size = 8 + this.random() * 8;
    anchor.alpha = 0.24;
    anchor.color = this.getRandomNeonColor();
    this.activeAnchors.push(anchor);
  }

  private spawnShape(x: number, y: number, role: "primary" | "secondary"): void {
    if (this.activeShapeCount >= MAX_ACTIVE_SHAPES) return;
    const effect = this.effectPool.acquire();
    const angle = this.random() * Math.PI * 2;
    // Slow down the speed a bit so physics are easier to see
    const speed = role === "primary" ? 20 + this.random() * 30 : 30 + this.random() * 40;
    // Make shapes larger
    const startSize = role === "primary" ? 120 + this.random() * 80 : 70 + this.random() * 50;

    effect.id = this.nextId++;
    effect.kind = SHAPE_KINDS[Math.floor(this.random() * SHAPE_KINDS.length)];
    effect.role = role;
    effect.active = true;
    effect.ageMs = 0;
    // Longer time to live so they have time to collide
    effect.ttlMs = role === "primary" ? 3500 + this.random() * 2000 : 2500 + this.random() * 1500;

    // Spread them out more
    effect.x = x + (this.random() - 0.5) * 120;
    effect.y = y + (this.random() - 0.5) * 120;
    effect.vx = Math.cos(angle) * speed;
    effect.vy = Math.sin(angle) * speed;
    effect.startSize = startSize * 0.1; // Pop in from small
    effect.endSize = startSize;
    effect.size = effect.startSize;
    effect.rotation = this.random() * Math.PI * 2;
    effect.rotationSpeed = (this.random() - 0.5) * 2;
    effect.alpha = 0;
    effect.color = this.getRandomNeonColor();
    effect.accentColor = this.getRandomNeonColor();
    this.activeEffects.push(effect);
  }

  private spawnRipple(x: number, y: number): void {
    if (this.activeRippleCount >= MAX_ACTIVE_RIPPLES) return;
    const effect = this.effectPool.acquire();
    const startSize = 20 + this.random() * 20;
    effect.id = this.nextId++;
    effect.kind = "ripple";
    effect.role = "ripple";
    effect.active = true;
    effect.ageMs = 0;
    effect.ttlMs = 1000 + this.random() * 800;
    effect.x = x;
    effect.y = y;
    effect.vx = 0;
    effect.vy = 0;
    effect.startSize = startSize;
    effect.endSize = startSize * 4;
    effect.size = startSize;
    effect.rotation = 0;
    effect.rotationSpeed = 0;
    effect.alpha = 0.14;
    effect.color = this.getRandomNeonColor();
    effect.accentColor = effect.color;
    this.activeEffects.push(effect);
  }

  private spawnParticle(x: number, y: number): void {
    if (this.activeParticleCount >= MAX_ACTIVE_PARTICLES) return;
    const effect = this.effectPool.acquire();
    const angle = this.random() * Math.PI * 2;
    const speed = 20 + this.random() * 60;
    const size = 3 + this.random() * 4;
    effect.id = this.nextId++;
    effect.kind = "particle";
    effect.role = "particle";
    effect.active = true;
    effect.ageMs = 0;
    effect.ttlMs = 1000 + this.random() * 1000;
    effect.x = x;
    effect.y = y;
    effect.vx = Math.cos(angle) * speed;
    effect.vy = Math.sin(angle) * speed;
    effect.startSize = size;
    effect.endSize = size * 0.2;
    effect.size = size;
    effect.rotation = 0;
    effect.rotationSpeed = 0;
    effect.alpha = 0;
    effect.color = this.getRandomNeonColor();
    effect.accentColor = effect.color;
    this.activeEffects.push(effect);
  }

  private spawnCenter(code: string): { x: number; y: number } {
    let hash = 0;
    for (let i = 0; i < code.length; i += 1) hash = (hash * 31 + code.charCodeAt(i)) >>> 0;
    return {
      x: this.width * (0.1 + (hash % 80) / 100),
      y: this.height * (0.1 + ((hash >> 8) % 80) / 100)
    };
  }

  private getRandomNeonColor(): string {
    return visualPalette.neonColors[Math.floor(this.random() * visualPalette.neonColors.length)];
  }

  private createEffect(): Effect {
    return {
      id: 0,
      kind: "particle",
      role: "particle",
      active: false,
      ageMs: 0,
      ttlMs: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 0,
      startSize: 0,
      endSize: 0,
      rotation: 0,
      rotationSpeed: 0,
      alpha: 0,
      color: "#000000",
      accentColor: "#000000"
    };
  }

  private createAnchor(): Anchor {
    return { id: 0, active: false, ageMs: 0, ttlMs: 0, x: 0, y: 0, size: 0, alpha: 0, color: "#000000" };
  }

  private resetEffect(effect: Effect): void {
    effect.active = false;
    effect.ageMs = 0;
    effect.ttlMs = 0;
    effect.alpha = 0;
  }

  private resetAnchor(anchor: Anchor): void {
    anchor.active = false;
    anchor.ageMs = 0;
    anchor.ttlMs = 0;
    anchor.alpha = 0;
  }

  private random(): number {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 0xffffffff;
  }
}

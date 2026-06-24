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

type EngineOptions = {
  width: number;
  height: number;
  seed?: number;
};

const SHAPE_KINDS: EffectKind[] = ["circle", "square", "triangle"];
const GEOMETRY_COLORS = ["#7f9987", "#6f8490", "#8c7f9c", "#9a855e", "#5f7f78"];
const PARTICLE_COLORS = ["#a7b8a8", "#9fb3ba", "#b3a6bc", "#b6a06f"];

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
    const center = this.spawnCenter(code);
    this.spawnAnchor(center.x, center.y);
    this.spawnRipple(center.x, center.y);
    this.spawnShape(center.x, center.y, "primary");

    const secondaryCount = 1 + Math.floor(this.random() * 2);
    for (let i = 0; i < secondaryCount; i += 1) this.spawnShape(center.x, center.y, "secondary");

    const particleCount = 4 + Math.floor(this.random() * 5);
    for (let i = 0; i < particleCount; i += 1) this.spawnParticle(center.x, center.y);
  }

  update(deltaMs: number): void {
    this.updateEffects(deltaMs);
    this.updateAnchors(deltaMs);
  }

  private updateEffects(deltaMs: number): void {
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
      const seconds = deltaMs / 1000;
      effect.x += effect.vx * seconds;
      effect.y += effect.vy * seconds;
      effect.size = effect.startSize + (effect.endSize - effect.startSize) * eased;
      effect.rotation += effect.rotationSpeed * seconds;
      effect.alpha = Math.max(0, (effect.role === "ripple" ? 0.24 : 0.58) * (1 - t));
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
      anchor.alpha = Math.max(0, 0.52 * (1 - anchor.ageMs / anchor.ttlMs));
    }
  }

  private spawnAnchor(x: number, y: number): void {
    if (this.activeAnchors.length >= MAX_ACTIVE_ANCHORS) return;
    const anchor = this.anchorPool.acquire();
    anchor.id = this.nextId++;
    anchor.active = true;
    anchor.ageMs = 0;
    anchor.ttlMs = 5200 + this.random() * 1200;
    anchor.x = x;
    anchor.y = y;
    anchor.size = 8 + this.random() * 8;
    anchor.alpha = 0.52;
    anchor.color = GEOMETRY_COLORS[Math.floor(this.random() * GEOMETRY_COLORS.length)];
    this.activeAnchors.push(anchor);
  }

  private spawnShape(x: number, y: number, role: "primary" | "secondary"): void {
    if (this.activeShapeCount >= MAX_ACTIVE_SHAPES) return;
    const effect = this.effectPool.acquire();
    const angle = this.random() * Math.PI * 2;
    const speed = role === "primary" ? 14 + this.random() * 18 : 18 + this.random() * 28;
    const startSize = role === "primary" ? 54 + this.random() * 90 : 30 + this.random() * 52;
    effect.id = this.nextId++;
    effect.kind = SHAPE_KINDS[Math.floor(this.random() * SHAPE_KINDS.length)];
    effect.role = role;
    effect.active = true;
    effect.ageMs = 0;
    effect.ttlMs = role === "primary" ? 2600 + this.random() * 1800 : 1800 + this.random() * 1700;
    effect.x = x + (this.random() - 0.5) * 80;
    effect.y = y + (this.random() - 0.5) * 64;
    effect.vx = Math.cos(angle) * speed;
    effect.vy = Math.sin(angle) * speed - 7;
    effect.startSize = startSize;
    effect.endSize = startSize * (1.08 + this.random() * 0.22);
    effect.size = effect.startSize;
    effect.rotation = this.random() * Math.PI;
    effect.rotationSpeed = (this.random() - 0.5) * 0.65;
    effect.alpha = role === "primary" ? 0.54 : 0.42;
    effect.color = GEOMETRY_COLORS[Math.floor(this.random() * GEOMETRY_COLORS.length)];
    effect.accentColor = PARTICLE_COLORS[Math.floor(this.random() * PARTICLE_COLORS.length)];
    this.activeEffects.push(effect);
  }

  private spawnRipple(x: number, y: number): void {
    if (this.activeRippleCount >= MAX_ACTIVE_RIPPLES) return;
    const effect = this.effectPool.acquire();
    const startSize = 44 + this.random() * 34;
    effect.id = this.nextId++;
    effect.kind = "ripple";
    effect.role = "ripple";
    effect.active = true;
    effect.ageMs = 0;
    effect.ttlMs = 2000 + this.random() * 1200;
    effect.x = x;
    effect.y = y;
    effect.vx = 0;
    effect.vy = 0;
    effect.startSize = startSize;
    effect.endSize = startSize * 2.4;
    effect.size = startSize;
    effect.rotation = 0;
    effect.rotationSpeed = 0;
    effect.alpha = 0.22;
    effect.color = "#8fa08a";
    effect.accentColor = "#827a9a";
    this.activeEffects.push(effect);
  }

  private spawnParticle(x: number, y: number): void {
    if (this.activeParticleCount >= MAX_ACTIVE_PARTICLES) return;
    const effect = this.effectPool.acquire();
    const angle = this.random() * Math.PI * 2;
    const speed = 12 + this.random() * 24;
    const size = 3 + this.random() * 5;
    effect.id = this.nextId++;
    effect.kind = "particle";
    effect.role = "particle";
    effect.active = true;
    effect.ageMs = 0;
    effect.ttlMs = 1400 + this.random() * 1500;
    effect.x = x + (this.random() - 0.5) * 76;
    effect.y = y + (this.random() - 0.5) * 64;
    effect.vx = Math.cos(angle) * speed;
    effect.vy = Math.sin(angle) * speed - 5;
    effect.startSize = size;
    effect.endSize = size * 0.7;
    effect.size = size;
    effect.rotation = 0;
    effect.rotationSpeed = 0;
    effect.alpha = 0.42;
    effect.color = PARTICLE_COLORS[Math.floor(this.random() * PARTICLE_COLORS.length)];
    effect.accentColor = effect.color;
    this.activeEffects.push(effect);
  }

  private spawnCenter(code: string): { x: number; y: number } {
    let hash = 0;
    for (let i = 0; i < code.length; i += 1) hash = (hash * 31 + code.charCodeAt(i)) >>> 0;
    return {
      x: this.width * (0.2 + (hash % 60) / 100),
      y: this.height * (0.24 + ((hash >> 8) % 52) / 100)
    };
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

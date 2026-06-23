import { ObjectPool } from "./objectPool";
import { Effect, EffectKind, MAX_ACTIVE_PARTICLES, MAX_ACTIVE_SHAPES } from "./types";

type EngineOptions = {
  width: number;
  height: number;
  seed?: number;
};

const SHAPE_KINDS: EffectKind[] = ["circle", "square", "triangle"];
const COLORS = ["#789f93", "#a89976", "#7f87b1", "#8aa7b5", "#8d9b8d"];

export class EffectEngine {
  private nextId = 1;
  private width: number;
  private height: number;
  private seed: number;
  private readonly activeEffects: Effect[] = [];
  private readonly shapePool = new ObjectPool<Effect>(() => this.createEffect(), item => this.resetEffect(item));
  private readonly particlePool = new ObjectPool<Effect>(() => this.createEffect(), item => this.resetEffect(item));

  constructor(options: EngineOptions) {
    this.width = options.width;
    this.height = options.height;
    this.seed = options.seed ?? Date.now();
  }

  get effects(): readonly Effect[] {
    return this.activeEffects;
  }

  get activeShapeCount(): number {
    return this.activeEffects.filter(effect => effect.kind !== "particle").length;
  }

  get activeParticleCount(): number {
    return this.activeEffects.filter(effect => effect.kind === "particle").length;
  }

  get inactiveShapePoolCount(): number {
    return this.shapePool.inactiveCount;
  }

  get inactiveParticlePoolCount(): number {
    return this.particlePool.inactiveCount;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  spawnForKey(code: string): void {
    const center = this.spawnCenter(code);
    const shapeCount = 2 + Math.floor(this.random() * 3);
    const particleCount = 3 + Math.floor(this.random() * 4);

    for (let i = 0; i < shapeCount; i += 1) {
      if (this.activeShapeCount >= MAX_ACTIVE_SHAPES) break;
      this.spawnShape(center.x, center.y);
    }

    for (let i = 0; i < particleCount; i += 1) {
      if (this.activeParticleCount >= MAX_ACTIVE_PARTICLES) break;
      this.spawnParticle(center.x, center.y);
    }
  }

  update(deltaMs: number): void {
    for (let i = this.activeEffects.length - 1; i >= 0; i -= 1) {
      const effect = this.activeEffects[i];
      effect.ageMs += deltaMs;

      if (effect.ageMs >= effect.ttlMs) {
        this.activeEffects.splice(i, 1);
        if (effect.kind === "particle") this.particlePool.release(effect);
        else this.shapePool.release(effect);
        continue;
      }

      const seconds = deltaMs / 1000;
      effect.x += effect.vx * seconds;
      effect.y += effect.vy * seconds;
      effect.rotation += effect.rotationSpeed * seconds;
      effect.alpha = Math.max(0, 0.58 * (1 - effect.ageMs / effect.ttlMs));
    }
  }

  private spawnShape(x: number, y: number): void {
    const effect = this.shapePool.acquire();
    const angle = this.random() * Math.PI * 2;
    const speed = 10 + this.random() * 22;

    effect.id = this.nextId++;
    effect.kind = SHAPE_KINDS[Math.floor(this.random() * SHAPE_KINDS.length)];
    effect.active = true;
    effect.ageMs = 0;
    effect.ttlMs = 1800 + this.random() * 2200;
    effect.x = x + (this.random() - 0.5) * 120;
    effect.y = y + (this.random() - 0.5) * 90;
    effect.vx = Math.cos(angle) * speed;
    effect.vy = Math.sin(angle) * speed - 8;
    effect.size = 42 + this.random() * 86;
    effect.rotation = this.random() * Math.PI;
    effect.rotationSpeed = (this.random() - 0.5) * 0.8;
    effect.alpha = 0.48;
    effect.color = COLORS[Math.floor(this.random() * COLORS.length)];
    this.activeEffects.push(effect);
  }

  private spawnParticle(x: number, y: number): void {
    const effect = this.particlePool.acquire();
    const angle = this.random() * Math.PI * 2;
    const speed = 12 + this.random() * 28;

    effect.id = this.nextId++;
    effect.kind = "particle";
    effect.active = true;
    effect.ageMs = 0;
    effect.ttlMs = 1200 + this.random() * 1400;
    effect.x = x + (this.random() - 0.5) * 80;
    effect.y = y + (this.random() - 0.5) * 70;
    effect.vx = Math.cos(angle) * speed;
    effect.vy = Math.sin(angle) * speed - 6;
    effect.size = 3 + this.random() * 6;
    effect.rotation = 0;
    effect.rotationSpeed = 0;
    effect.alpha = 0.42;
    effect.color = "#9fbfb4";
    this.activeEffects.push(effect);
  }

  private spawnCenter(code: string): { x: number; y: number } {
    let hash = 0;
    for (let i = 0; i < code.length; i += 1) {
      hash = (hash * 31 + code.charCodeAt(i)) >>> 0;
    }

    return {
      x: this.width * (0.25 + (hash % 50) / 100),
      y: this.height * (0.3 + ((hash >> 8) % 40) / 100)
    };
  }

  private createEffect(): Effect {
    return {
      id: 0,
      kind: "particle",
      active: false,
      ageMs: 0,
      ttlMs: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 0,
      rotation: 0,
      rotationSpeed: 0,
      alpha: 0,
      color: "#000000"
    };
  }

  private resetEffect(effect: Effect): void {
    effect.active = false;
    effect.ageMs = 0;
    effect.ttlMs = 0;
    effect.alpha = 0;
  }

  private random(): number {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 0xffffffff;
  }
}

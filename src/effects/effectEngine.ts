import { ObjectPool } from "./objectPool";
import {
  Anchor,
  Effect,
  EffectKind,
  EffectRole,
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

const PRIMARY_KINDS: EffectKind[] = ["house", "tree", "hill", "cloud"];
const DETAIL_KINDS: EffectKind[] = ["flower", "leaf", "pathStone", "sparkle"];
const HOUSE_COLORS = ["#f2b57d", "#e9a37f", "#f4c46f", "#dba289"];
const TREE_COLORS = ["#f0cf67", "#e9bd58", "#bcd49b", "#c8d99e"];
const GROUND_COLORS = ["#eadba9", "#d9c895", "#c9d8a4", "#f0d7a4"];
const SKY_COLORS = ["#fffaf0", "#f8f1df", "#ffffff"];
const DETAIL_COLORS = ["#f5d86e", "#d88970", "#b8ce8f", "#f8e2a1"];

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
    return this.activeEffects.filter(effect => effect.role === "ground" || effect.role === "midground" || effect.role === "sky").length;
  }

  get activeParticleCount(): number {
    return this.activeEffects.filter(effect => effect.role === "detail" || effect.role === "sparkle").length;
  }

  get activeRippleCount(): number {
    return this.activeEffects.filter(effect => effect.role === "sparkle").length;
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
    const groupRoll = this.random();

    if (groupRoll < 0.28) {
      this.spawnWorldItem(center.x, center.y, "house", "midground");
      this.spawnWorldItem(center.x + this.offset(42), center.y + this.offset(14), "tree", "midground");
    } else if (groupRoll < 0.56) {
      this.spawnWorldItem(center.x, center.y, "tree", "midground");
    } else if (groupRoll < 0.78) {
      this.spawnWorldItem(center.x, center.y + 8, "hill", "ground");
    } else {
      this.spawnWorldItem(center.x, this.height * (0.14 + this.random() * 0.22), "cloud", "sky");
    }

    const detailCount = 3 + Math.floor(this.random() * 4);
    for (let i = 0; i < detailCount; i += 1) {
      const kind = DETAIL_KINDS[Math.floor(this.random() * DETAIL_KINDS.length)];
      const role: EffectRole = kind === "sparkle" ? "sparkle" : "detail";
      const detailY = kind === "leaf" ? center.y - 40 - this.random() * 90 : center.y + this.offset(24);
      this.spawnWorldItem(center.x + this.offset(88), detailY, kind, role);
    }
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
      const appear = Math.min(1, t / 0.18);
      const eased = 1 - Math.pow(1 - appear, 3);
      const fade = 1 - Math.max(0, t - 0.74) / 0.26;
      const seconds = deltaMs / 1000;
      effect.x += effect.vx * seconds;
      effect.y += effect.vy * seconds;
      effect.size = effect.startSize + (effect.endSize - effect.startSize) * eased;
      effect.rotation += effect.rotationSpeed * seconds;
      effect.alpha = Math.max(0, this.maxAlphaFor(effect.role) * Math.min(1, appear) * fade);
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
    anchor.size = 8 + this.random() * 10;
    anchor.alpha = 0.28;
    anchor.color = DETAIL_COLORS[Math.floor(this.random() * DETAIL_COLORS.length)];
    this.activeAnchors.push(anchor);
  }

  private spawnWorldItem(x: number, y: number, kind: EffectKind, role: EffectRole): void {
    if ((role === "ground" || role === "midground" || role === "sky") && this.activeShapeCount >= MAX_ACTIVE_SHAPES) return;
    if ((role === "detail" || role === "sparkle") && this.activeParticleCount >= MAX_ACTIVE_PARTICLES) return;
    if (role === "sparkle" && this.activeRippleCount >= MAX_ACTIVE_RIPPLES) return;
    const effect = this.effectPool.acquire();
    const angle = -Math.PI / 2 + (this.random() - 0.5) * Math.PI;
    const speed = role === "sparkle" ? 10 + this.random() * 20 : 2 + this.random() * 8;
    const endSize = this.sizeFor(kind);
    effect.id = this.nextId++;
    effect.kind = kind;
    effect.role = role;
    effect.active = true;
    effect.ageMs = 0;
    effect.ttlMs = role === "sparkle" ? 1700 + this.random() * 1200 : 9000 + this.random() * 6000;
    const margin = Math.max(30, endSize * (kind === "hill" || kind === "cloud" || kind === "tree" ? 0.64 : 0.5));
    effect.x = this.clamp(x, margin, Math.max(margin, this.width - margin));
    effect.y = this.clamp(y, 20, Math.max(20, this.height - Math.max(24, endSize * 0.28)));
    effect.vx = Math.cos(angle) * speed;
    effect.vy = role === "sparkle" || kind === "leaf" ? Math.sin(angle) * speed - 8 : -1 - this.random() * 3;
    effect.startSize = endSize * 0.2;
    effect.endSize = endSize;
    effect.size = effect.startSize;
    effect.rotation = (this.random() - 0.5) * 0.24;
    effect.rotationSpeed = (kind === "leaf" || role === "sparkle" ? 0.35 : 0.08) * (this.random() - 0.5);
    effect.alpha = 0;
    effect.color = this.colorFor(kind);
    effect.accentColor = DETAIL_COLORS[Math.floor(this.random() * DETAIL_COLORS.length)];
    this.activeEffects.push(effect);
  }

  private spawnCenter(code: string): { x: number; y: number } {
    let hash = 2166136261;
    for (let i = 0; i < code.length; i += 1) {
      hash ^= code.charCodeAt(i);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    hash = (hash ^ (hash >>> 16)) >>> 0;
    hash = Math.imul(hash, 2246822507) >>> 0;
    hash = (hash ^ (hash >>> 13)) >>> 0;
    hash = Math.imul(hash, 3266489909) >>> 0;
    hash = (hash ^ (hash >>> 16)) >>> 0;
    return {
      x: this.width * (0.16 + (hash % 68) / 100),
      y: this.height * (0.52 + ((hash >> 8) % 34) / 100)
    };
  }

  private createEffect(): Effect {
    return {
      id: 0,
      kind: "sparkle",
      role: "sparkle",
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

  private sizeFor(kind: EffectKind): number {
    if (kind === "house") return 58 + this.random() * 34;
    if (kind === "tree") return 70 + this.random() * 58;
    if (kind === "hill") return 120 + this.random() * 130;
    if (kind === "cloud") return 72 + this.random() * 90;
    if (kind === "flower") return 10 + this.random() * 10;
    if (kind === "leaf") return 8 + this.random() * 9;
    if (kind === "pathStone") return 14 + this.random() * 16;
    return 8 + this.random() * 10;
  }

  private colorFor(kind: EffectKind): string {
    if (kind === "house") return HOUSE_COLORS[Math.floor(this.random() * HOUSE_COLORS.length)];
    if (kind === "tree") return TREE_COLORS[Math.floor(this.random() * TREE_COLORS.length)];
    if (kind === "hill") return GROUND_COLORS[Math.floor(this.random() * GROUND_COLORS.length)];
    if (kind === "cloud") return SKY_COLORS[Math.floor(this.random() * SKY_COLORS.length)];
    return DETAIL_COLORS[Math.floor(this.random() * DETAIL_COLORS.length)];
  }

  private maxAlphaFor(role: EffectRole): number {
    if (role === "sky") return 0.82;
    if (role === "ground") return 0.78;
    if (role === "sparkle") return 0.66;
    if (role === "detail") return 0.82;
    return 0.94;
  }

  private offset(range: number): number {
    return (this.random() - 0.5) * range * 2;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private random(): number {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 0xffffffff;
  }
}

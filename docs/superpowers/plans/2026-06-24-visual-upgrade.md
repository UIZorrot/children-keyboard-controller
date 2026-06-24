# Visual Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the child-facing Canvas visuals to a deep warm beige Atmospheric Depth + Generative Constellation style while preserving keyboard control, `Esc` exit behavior, and bounded resource use.

**Architecture:** Keep one visible full-screen Canvas and split visual responsibilities into pure logic modules plus focused drawing modules. `EffectEngine` owns pooled burst objects and anchors, `ConstellationRenderer` computes/draws bounded links, `AtmosphereField` draws slow low-frequency depth, and `CanvasRenderer` orchestrates resize and draw order. Existing Electron keyboard blocking and exit IPC stay unchanged.

**Tech Stack:** Electron, TypeScript, Vite, Vitest, Canvas 2D API, existing object pool, existing Windows native keyboard blocker.

---

## File Structure

- Modify `src/effects/types.ts`: add `ripple`, `anchor`, effect roles, richer visual properties, and caps.
- Modify `src/effects/effectEngine.ts`: convert per-key spawning into burst groups with shapes, particles, ripples, and anchors.
- Modify `tests/effects/effectEngine.test.ts`: replace old cap/lifecycle tests with upgraded cap, ripple, and anchor behavior.
- Create `src/effects/constellation.ts`: pure bounded link-generation logic.
- Create `tests/effects/constellation.test.ts`: distance and max-link tests.
- Create `src/visual/palette.ts`: deep beige palette constants.
- Create `src/visual/AtmosphereField.ts`: deterministic background field state and draw method.
- Create `src/visual/CanvasRenderer.ts`: Canvas draw orchestration, draw order, geometry rendering, resize.
- Modify `src/renderer.ts`: reduce to DOM keyboard wiring, resize, and frame loop.
- Modify `src/styles.css`: switch body background and exit progress center to deep warm beige.
- Modify `docs/manual-windows-verification.md`: add visual upgrade checks.

## Task 1: Extend Effect Types And Tests

**Files:**
- Modify: `src/effects/types.ts`
- Modify: `tests/effects/effectEngine.test.ts`

- [ ] **Step 1: Write failing upgraded effect tests**

Replace `tests/effects/effectEngine.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { EffectEngine } from "../../src/effects/effectEngine";
import {
  MAX_ACTIVE_ANCHORS,
  MAX_ACTIVE_PARTICLES,
  MAX_ACTIVE_RIPPLES,
  MAX_ACTIVE_SHAPES
} from "../../src/effects/types";

describe("EffectEngine", () => {
  it("spawns bounded burst groups with shapes, particles, ripples, and anchors", () => {
    const engine = new EffectEngine({ width: 900, height: 600, seed: 11 });

    for (let i = 0; i < 220; i += 1) {
      engine.spawnForKey(`Key${i}`);
    }

    expect(engine.activeShapeCount).toBeLessThanOrEqual(MAX_ACTIVE_SHAPES);
    expect(engine.activeParticleCount).toBeLessThanOrEqual(MAX_ACTIVE_PARTICLES);
    expect(engine.activeRippleCount).toBeLessThanOrEqual(MAX_ACTIVE_RIPPLES);
    expect(engine.activeAnchorCount).toBeLessThanOrEqual(MAX_ACTIVE_ANCHORS);
    expect(engine.anchors.length).toBe(engine.activeAnchorCount);
  });

  it("expires ripples and anchors without leaking active effects", () => {
    const engine = new EffectEngine({ width: 800, height: 500, seed: 12 });
    engine.spawnForKey("KeyA");

    expect(engine.activeRippleCount).toBeGreaterThan(0);
    expect(engine.activeAnchorCount).toBeGreaterThan(0);

    engine.update(7000);

    expect(engine.effects.length).toBe(0);
    expect(engine.anchors.length).toBe(0);
    expect(engine.activeRippleCount).toBe(0);
    expect(engine.activeAnchorCount).toBe(0);
    expect(engine.inactiveRipplePoolCount).toBeGreaterThan(0);
    expect(engine.inactiveAnchorPoolCount).toBeGreaterThan(0);
  });

  it("resize updates future spawn centers without clearing active composition", () => {
    const engine = new EffectEngine({ width: 320, height: 220, seed: 13 });
    engine.spawnForKey("KeyA");
    const activeBeforeResize = engine.effects.length;

    engine.resize(1200, 800);
    engine.spawnForKey("KeyB");

    expect(engine.effects.length).toBeGreaterThan(activeBeforeResize);
    expect(engine.anchors.some(anchor => anchor.x > 320 || anchor.y > 220)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npx vitest run tests/effects/effectEngine.test.ts --no-color
```

Expected: FAIL with missing exports such as `MAX_ACTIVE_ANCHORS`, `activeRippleCount`, or `anchors`.

- [ ] **Step 3: Extend effect types**

Update `src/effects/types.ts` to:

```ts
export type EffectKind = "circle" | "square" | "triangle" | "particle" | "ripple";
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

export const MAX_ACTIVE_SHAPES = 90;
export const MAX_ACTIVE_PARTICLES = 130;
export const MAX_ACTIVE_RIPPLES = 40;
export const MAX_ACTIVE_ANCHORS = 48;
export const MAX_CONSTELLATION_LINKS = 80;
```

- [ ] **Step 4: Run test and confirm it still fails for implementation**

Run:

```powershell
npx vitest run tests/effects/effectEngine.test.ts --no-color
```

Expected: FAIL because `EffectEngine` has not implemented ripple and anchor APIs yet.

## Task 2: Implement Burst Groups, Ripples, And Anchors

**Files:**
- Modify: `src/effects/effectEngine.ts`
- Test: `tests/effects/effectEngine.test.ts`

- [ ] **Step 1: Replace `EffectEngine` implementation**

Use this implementation shape in `src/effects/effectEngine.ts`:

```ts
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
```

- [ ] **Step 2: Run upgraded effect tests**

Run:

```powershell
npx vitest run tests/effects/effectEngine.test.ts --no-color
```

Expected: PASS.

- [ ] **Step 3: Run all current tests**

Run:

```powershell
npm test -- --no-color
```

Expected: PASS with all effect and exit tests.

- [ ] **Step 4: Commit**

Run:

```powershell
git add src/effects/types.ts src/effects/effectEngine.ts tests/effects/effectEngine.test.ts
git commit -m "feat: add visual burst groups"
```

Expected: a commit containing only upgraded effect engine logic and tests.

## Task 3: Add Constellation Link Generation

**Files:**
- Create: `src/effects/constellation.ts`
- Create: `tests/effects/constellation.test.ts`

- [ ] **Step 1: Write failing constellation tests**

Create `tests/effects/constellation.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npx vitest run tests/effects/constellation.test.ts --no-color
```

Expected: FAIL because `src/effects/constellation.ts` does not exist.

- [ ] **Step 3: Implement link generator**

Create `src/effects/constellation.ts`:

```ts
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
```

- [ ] **Step 4: Run constellation tests**

Run:

```powershell
npx vitest run tests/effects/constellation.test.ts --no-color
```

Expected: PASS.

- [ ] **Step 5: Run all tests and commit**

Run:

```powershell
npm test -- --no-color
git add src/effects/constellation.ts tests/effects/constellation.test.ts
git commit -m "feat: add constellation link generation"
```

Expected: all tests pass, then a focused commit is created.

## Task 4: Add Visual Palette, Atmosphere Field, And Canvas Renderer

**Files:**
- Create: `src/visual/palette.ts`
- Create: `src/visual/AtmosphereField.ts`
- Create: `src/visual/CanvasRenderer.ts`
- Modify: `src/styles.css`

- [ ] **Step 1: Create deep warm palette**

Create `src/visual/palette.ts`:

```ts
export const visualPalette = {
  background: "#17120d",
  backgroundSoft: "#1e1912",
  atmosphere: ["rgba(105, 128, 105, 0.18)", "rgba(93, 113, 127, 0.14)", "rgba(121, 101, 137, 0.13)", "rgba(143, 119, 76, 0.12)"],
  link: "rgba(151, 168, 150, 0.32)",
  ripple: "rgba(149, 165, 140, 0.22)",
  particle: "rgba(177, 185, 163, 0.48)"
} as const;
```

- [ ] **Step 2: Create atmosphere field**

Create `src/visual/AtmosphereField.ts`:

```ts
import { visualPalette } from "./palette";

type Blob = {
  xRatio: number;
  yRatio: number;
  radiusRatio: number;
  phase: number;
  speed: number;
  color: string;
};

const BLOBS: Blob[] = [
  { xRatio: 0.18, yRatio: 0.28, radiusRatio: 0.34, phase: 0, speed: 0.00012, color: visualPalette.atmosphere[0] },
  { xRatio: 0.78, yRatio: 0.24, radiusRatio: 0.38, phase: 2.1, speed: 0.0001, color: visualPalette.atmosphere[1] },
  { xRatio: 0.62, yRatio: 0.74, radiusRatio: 0.42, phase: 4.2, speed: 0.00009, color: visualPalette.atmosphere[2] },
  { xRatio: 0.28, yRatio: 0.82, radiusRatio: 0.3, phase: 5.1, speed: 0.00011, color: visualPalette.atmosphere[3] }
];

export class AtmosphereField {
  draw(context: CanvasRenderingContext2D, width: number, height: number, nowMs: number): void {
    context.fillStyle = visualPalette.background;
    context.fillRect(0, 0, width, height);

    for (const blob of BLOBS) {
      const drift = nowMs * blob.speed + blob.phase;
      const x = width * blob.xRatio + Math.cos(drift) * width * 0.035;
      const y = height * blob.yRatio + Math.sin(drift * 0.8) * height * 0.04;
      const radius = Math.max(width, height) * blob.radiusRatio;
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, blob.color);
      gradient.addColorStop(0.52, blob.color.replace(/0\.\d+\)/, "0.055)"));
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
    }
  }
}
```

- [ ] **Step 3: Create canvas renderer**

Create `src/visual/CanvasRenderer.ts`:

```ts
import { createConstellationLinks } from "../effects/constellation";
import { EffectEngine } from "../effects/effectEngine";
import { Effect } from "../effects/types";
import { AtmosphereField } from "./AtmosphereField";
import { visualPalette } from "./palette";

export class CanvasRenderer {
  private width = 0;
  private height = 0;
  private readonly atmosphere = new AtmosphereField();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly context: CanvasRenderingContext2D,
    private readonly engine: EffectEngine
  ) {}

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.engine.resize(this.width, this.height);
  }

  draw(nowMs: number): void {
    this.atmosphere.draw(this.context, this.width, this.height, nowMs);
    this.drawConstellation();
    this.drawRipples();
    this.drawShapes();
    this.drawParticles();
  }

  private drawConstellation(): void {
    const links = createConstellationLinks(this.engine.anchors, {
      minDistance: 34,
      maxDistance: Math.min(260, Math.max(this.width, this.height) * 0.28),
      maxLinks: 80
    });
    if (links.length === 0) return;

    this.context.save();
    this.context.strokeStyle = visualPalette.link;
    this.context.lineWidth = 1;
    this.context.beginPath();
    for (const link of links) {
      this.context.globalAlpha = link.alpha;
      this.context.moveTo(Math.round(link.x1), Math.round(link.y1));
      this.context.lineTo(Math.round(link.x2), Math.round(link.y2));
    }
    this.context.stroke();
    this.context.restore();
  }

  private drawRipples(): void {
    for (const effect of this.engine.effects) {
      if (effect.role !== "ripple") continue;
      this.context.save();
      this.context.globalAlpha = effect.alpha;
      this.context.strokeStyle = visualPalette.ripple;
      this.context.lineWidth = 1.4;
      this.context.beginPath();
      this.context.arc(Math.round(effect.x), Math.round(effect.y), effect.size / 2, 0, Math.PI * 2);
      this.context.stroke();
      this.context.restore();
    }
  }

  private drawShapes(): void {
    for (const effect of this.engine.effects) {
      if (effect.role !== "primary" && effect.role !== "secondary") continue;
      this.drawGeometry(effect);
    }
  }

  private drawParticles(): void {
    this.context.save();
    for (const effect of this.engine.effects) {
      if (effect.role !== "particle") continue;
      this.context.globalAlpha = effect.alpha;
      this.context.fillStyle = effect.color;
      this.context.beginPath();
      this.context.arc(Math.round(effect.x), Math.round(effect.y), effect.size / 2, 0, Math.PI * 2);
      this.context.fill();
    }
    this.context.restore();
  }

  private drawGeometry(effect: Effect): void {
    this.context.save();
    this.context.globalAlpha = effect.alpha;
    this.context.translate(Math.round(effect.x), Math.round(effect.y));
    this.context.rotate(effect.rotation);

    const half = effect.size / 2;
    const gradient = this.context.createRadialGradient(-half * 0.3, -half * 0.35, 0, 0, 0, effect.size * 0.78);
    gradient.addColorStop(0, effect.accentColor);
    gradient.addColorStop(0.65, effect.color);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    this.context.fillStyle = gradient;

    if (effect.kind === "circle") {
      this.context.beginPath();
      this.context.arc(0, 0, half, 0, Math.PI * 2);
      this.context.fill();
    } else if (effect.kind === "square") {
      this.context.beginPath();
      this.context.roundRect(-half, -half, effect.size, effect.size, Math.min(16, half));
      this.context.fill();
    } else {
      this.context.beginPath();
      this.context.moveTo(0, -half);
      this.context.lineTo(half * 0.86, half);
      this.context.lineTo(-half * 0.86, half);
      this.context.closePath();
      this.context.fill();
    }

    this.context.restore();
  }
}
```

- [ ] **Step 4: Update CSS background**

Change `src/styles.css` background values:

```css
html,
body {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: #17120d;
  cursor: none;
  user-select: none;
}

#exit-progress {
  position: fixed;
  right: 28px;
  bottom: 28px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  opacity: 0;
  pointer-events: none;
  background:
    conic-gradient(rgba(150, 174, 150, 0.58) var(--progress, 0deg), rgba(255, 255, 255, 0.08) 0),
    radial-gradient(circle at center, #17120d 56%, transparent 58%);
  transition: opacity 120ms ease;
}
```

- [ ] **Step 5: Typecheck**

Run:

```powershell
npm run typecheck
```

Expected: PASS.

## Task 5: Wire Renderer To New CanvasRenderer

**Files:**
- Modify: `src/renderer.ts`

- [ ] **Step 1: Replace renderer drawing logic**

Replace `src/renderer.ts` with:

```ts
import "./platform/AppBridge";
import { EffectEngine } from "./effects/effectEngine";
import { EscHoldController } from "./exit/EscHoldController";
import { CanvasRenderer } from "./visual/CanvasRenderer";

const canvas = document.querySelector<HTMLCanvasElement>("#visual-canvas");
const exitProgress = document.querySelector<HTMLDivElement>("#exit-progress");

if (!canvas || !exitProgress) {
  throw new Error("Renderer host elements are missing");
}

const context = canvas.getContext("2d", { alpha: false });
if (!context) {
  throw new Error("2D canvas context is unavailable");
}

const exitProgressElement = exitProgress;
let lastFrame = performance.now();

const engine = new EffectEngine({ width: window.innerWidth, height: window.innerHeight });
const canvasRenderer = new CanvasRenderer(canvas, context, engine);
const exitController = new EscHoldController(() => {
  window.appBridge?.requestExit();
});

function render(now: number): void {
  const delta = Math.min(50, now - lastFrame);
  lastFrame = now;
  exitController.update(now);
  engine.update(delta);
  canvasRenderer.draw(now);

  if (exitController.isHolding) {
    exitProgressElement.classList.add("visible");
    exitProgressElement.style.setProperty("--progress", `${Math.round(exitController.progress * 360)}deg`);
  } else {
    exitProgressElement.classList.remove("visible");
    exitProgressElement.style.setProperty("--progress", "0deg");
  }

  requestAnimationFrame(render);
}

function swallowKeyboardEvent(event: KeyboardEvent): void {
  event.preventDefault();
  event.stopPropagation();

  if (event.type === "keydown") {
    exitController.keyDown(event.key, performance.now());
    if (event.key !== "Escape" || !event.repeat) {
      engine.spawnForKey(event.code || event.key);
    }
  } else if (event.type === "keyup") {
    exitController.keyUp(event.key);
  }
}

window.addEventListener("resize", () => canvasRenderer.resize());
window.addEventListener("keydown", swallowKeyboardEvent, { capture: true });
window.addEventListener("keyup", swallowKeyboardEvent, { capture: true });
window.addEventListener("contextmenu", event => event.preventDefault());

canvasRenderer.resize();
requestAnimationFrame(render);
```

- [ ] **Step 2: Build renderer**

Run:

```powershell
npm run build:renderer
```

Expected: PASS and Vite emits `dist/index.html` plus assets.

- [ ] **Step 3: Run typecheck and all tests**

Run:

```powershell
npm run typecheck
npm test -- --no-color
```

Expected: PASS.

- [ ] **Step 4: Commit visual renderer modules**

Run:

```powershell
git add src/visual/palette.ts src/visual/AtmosphereField.ts src/visual/CanvasRenderer.ts src/styles.css src/renderer.ts
git commit -m "feat: render atmospheric constellation visuals"
```

Expected: focused visual rendering commit.

## Task 6: Update Verification Docs And Package

**Files:**
- Modify: `docs/manual-windows-verification.md`

- [ ] **Step 1: Add visual verification checks**

Append this section to `docs/manual-windows-verification.md`:

```md
## Visual Upgrade

- Confirm the background reads as deep warm beige / taupe, not pure black.
- Press keys slowly. Expected: each press creates a soft burst with a ripple and main shape.
- Press keys repeatedly. Expected: recent shapes form gentle constellation links.
- Mash keys for 60 seconds. Expected: visual density remains bounded and no bright flashing appears.
- Hold `Esc` for 3 seconds. Expected: exit behavior is unchanged.
```

- [ ] **Step 2: Run full build**

Run:

```powershell
npm run build
```

Expected: PASS; tests pass, native addon builds, Electron bundles compile, renderer builds.

- [ ] **Step 3: Package app**

Run:

```powershell
npm run pack
```

Expected: PASS and `dist/win-unpacked/Children Keyboard Controller.exe` exists.

- [ ] **Step 4: Commit docs**

Run:

```powershell
git add docs/manual-windows-verification.md
git commit -m "docs: add visual upgrade verification"
```

Expected: focused docs commit.

## Self-Review

- Spec coverage: Deep beige background, atmospheric field, generative constellation links, burst groups, caps, object pooling, single visible canvas, CSS limited to exit ring, and manual verification are covered by Tasks 1-6.
- Placeholder scan: no unfinished sections, no `TBD`, no `TODO`, and no implementation step without concrete code or command.
- Type consistency: `Effect`, `Anchor`, `EffectEngine`, `createConstellationLinks`, `AtmosphereField`, `CanvasRenderer`, and `visualPalette` are named consistently across tests and implementation steps.
- External references used while designing: MDN Canvas optimization guidance and web.dev high-performance animation guidance.

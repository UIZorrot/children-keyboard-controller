# Children Keyboard Controller Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Windows-only Electron app that suppresses keyboard input and turns key presses into calm full-screen geometry effects with a 3-second `Esc` hold to exit.

**Architecture:** Electron owns the full-screen app shell, IPC, lifecycle, and Windows keyboard blocker. The renderer owns one canvas animation loop backed by pure TypeScript effect and exit-controller modules. A small Windows native addon wraps `SetWindowsHookExW(WH_KEYBOARD_LL)` behind a replaceable `KeyboardBlocker` adapter and blocks system shortcuts while allowing ordinary keys to reach the focused Electron window for visual feedback.

**Tech Stack:** Electron, TypeScript, Vite, Vitest, node-gyp, node-addon-api, electron-builder, Windows low-level keyboard hook API.

---

## File Structure

- Create `package.json`: scripts, dependencies, build config entry points.
- Create `tsconfig.json`: shared TypeScript config.
- Create `vite.renderer.config.ts`: renderer bundle config.
- Create `vitest.config.ts`: unit test config.
- Create `electron/main.ts`: Electron lifecycle, window creation, IPC, blocker startup/shutdown.
- Create `electron/preload.ts`: narrow IPC bridge for the renderer.
- Create `electron/keyboard/KeyboardBlocker.ts`: blocker interface.
- Create `electron/keyboard/WindowsKeyboardBlocker.ts`: TypeScript adapter around the native addon.
- Create `native/keyboard-blocker/binding.gyp`: native addon build config.
- Create `native/keyboard-blocker/keyboard_blocker.cc`: Windows keyboard hook implementation.
- Create `src/index.html`: renderer host document.
- Create `src/renderer.ts`: canvas app wiring and DOM keyboard handling.
- Create `src/styles.css`: full-screen dark visual surface styles.
- Create `src/effects/types.ts`: effect data types and constants.
- Create `src/effects/objectPool.ts`: reusable object pool.
- Create `src/effects/effectEngine.ts`: bounded calm-geometry spawning and update logic.
- Create `src/exit/EscHoldController.ts`: 3-second hold state machine.
- Create `src/platform/AppBridge.ts`: renderer-facing preload API types.
- Create `tests/effects/objectPool.test.ts`: pool behavior tests.
- Create `tests/effects/effectEngine.test.ts`: lifecycle and cap tests.
- Create `tests/exit/EscHoldController.test.ts`: exit long-press tests.
- Create `docs/manual-windows-verification.md`: manual behavior checklist.
- Create `.gitignore`: dependency, build, and local preview ignores.

## Task 1: Scaffold Project Configuration

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.renderer.config.ts`
- Create: `vitest.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "children-keyboard-controller",
  "version": "0.1.0",
  "description": "Windows-only full-screen keyboard mashing visual controller for children.",
  "main": "dist-electron/main.js",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "npm run build:native && concurrently -k \"vite --config vite.renderer.config.ts --host 127.0.0.1\" \"wait-on http://127.0.0.1:5173 && cross-env VITE_DEV_SERVER_URL=http://127.0.0.1:5173 electron .\"",
    "build": "npm run clean && npm run test && npm run build:native && npm run build:main && npm run build:preload && npm run build:renderer",
    "build:main": "esbuild electron/main.ts --bundle --platform=node --format=esm --external:electron --outfile=dist-electron/main.js",
    "build:preload": "esbuild electron/preload.ts --bundle --platform=node --format=cjs --external:electron --outfile=dist-electron/preload.cjs",
    "build:renderer": "vite build --config vite.renderer.config.ts",
    "build:native": "node-gyp rebuild --directory native/keyboard-blocker",
    "clean": "rimraf dist dist-electron native/keyboard-blocker/build",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "pack": "npm run build && electron-builder --dir",
    "dist": "npm run build && electron-builder"
  },
  "build": {
    "appId": "local.children.keyboard-controller",
    "productName": "Children Keyboard Controller",
    "files": [
      "dist/**",
      "dist-electron/**",
      "native/keyboard-blocker/build/Release/keyboard_blocker.node",
      "package.json"
    ],
    "asarUnpack": [
      "native/keyboard-blocker/build/Release/keyboard_blocker.node"
    ],
    "win": {
      "target": "nsis"
    }
  },
  "dependencies": {
    "electron": "^31.7.7",
    "node-addon-api": "^8.5.0"
  },
  "devDependencies": {
    "@types/node": "^20.14.15",
    "@vitejs/plugin-legacy": "^5.4.2",
    "concurrently": "^8.2.2",
    "cross-env": "^7.0.3",
    "electron-builder": "^24.13.3",
    "esbuild": "^0.23.1",
    "node-gyp": "^10.2.0",
    "rimraf": "^5.0.10",
    "typescript": "^5.5.4",
    "vite": "^5.4.19",
    "vitest": "^2.1.9",
    "wait-on": "^7.2.0"
  }
}
```

- [ ] **Step 2: Create TypeScript, Vite, Vitest, and ignore files**

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["node", "vitest/globals"]
  },
  "include": ["electron/**/*.ts", "src/**/*.ts", "tests/**/*.ts", "*.ts"]
}
```

```ts
// vite.renderer.config.ts
import { defineConfig } from "vite";

export default defineConfig({
  root: "src",
  base: "./",
  build: {
    outDir: "../dist",
    emptyOutDir: true
  }
});
```

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"]
  }
});
```

```gitignore
# .gitignore
node_modules/
dist/
dist-electron/
native/keyboard-blocker/build/
.superpowers/
*.log
```

- [ ] **Step 3: Install dependencies**

Run:

```powershell
npm install
```

Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 4: Run the empty test command**

Run:

```powershell
npm test
```

Expected: Vitest exits with either a successful empty run or a non-zero "no test files found" message. If there is a "no test files found" message, continue to Task 2 before using `npm test` as the verification gate.

- [ ] **Step 5: Commit when a git repository exists**

Run:

```powershell
if (Test-Path .git) {
  git add package.json package-lock.json tsconfig.json vite.renderer.config.ts vitest.config.ts .gitignore
  git commit -m "chore: scaffold electron project"
}
```

Expected: in a git repository, a scaffold commit is created. Outside a git repository, the command does nothing.

## Task 2: Implement Effect Object Pool

**Files:**
- Create: `src/effects/types.ts`
- Create: `src/effects/objectPool.ts`
- Test: `tests/effects/objectPool.test.ts`

- [ ] **Step 1: Write failing object pool tests**

```ts
// tests/effects/objectPool.test.ts
import { describe, expect, it } from "vitest";
import { ObjectPool } from "../../src/effects/objectPool";

type Item = { value: number; active: boolean };

describe("ObjectPool", () => {
  it("reuses released objects before creating new objects", () => {
    let created = 0;
    const pool = new ObjectPool<Item>(() => ({ value: ++created, active: false }), item => {
      item.active = false;
      item.value = 0;
    });

    const first = pool.acquire();
    first.value = 42;
    first.active = true;
    pool.release(first);

    const second = pool.acquire();
    expect(second).toBe(first);
    expect(second).toEqual({ value: 0, active: false });
    expect(created).toBe(1);
  });

  it("tracks inactive object count", () => {
    const pool = new ObjectPool<Item>(() => ({ value: 0, active: false }), item => {
      item.active = false;
    });

    const a = pool.acquire();
    const b = pool.acquire();
    pool.release(a);
    pool.release(b);

    expect(pool.inactiveCount).toBe(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npx vitest run tests/effects/objectPool.test.ts
```

Expected: FAIL with a module resolution error for `src/effects/objectPool`.

- [ ] **Step 3: Implement effect types and object pool**

```ts
// src/effects/types.ts
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
```

```ts
// src/effects/objectPool.ts
export class ObjectPool<T> {
  private readonly inactive: T[] = [];

  constructor(
    private readonly createItem: () => T,
    private readonly resetItem: (item: T) => void
  ) {}

  get inactiveCount(): number {
    return this.inactive.length;
  }

  acquire(): T {
    return this.inactive.pop() ?? this.createItem();
  }

  release(item: T): void {
    this.resetItem(item);
    this.inactive.push(item);
  }
}
```

- [ ] **Step 4: Run object pool tests**

Run:

```powershell
npx vitest run tests/effects/objectPool.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit when a git repository exists**

Run:

```powershell
if (Test-Path .git) {
  git add src/effects/types.ts src/effects/objectPool.ts tests/effects/objectPool.test.ts
  git commit -m "test: add effect object pool"
}
```

Expected: in a git repository, a focused object pool commit is created.

## Task 3: Implement Bounded Calm Geometry Engine

**Files:**
- Modify: `src/effects/types.ts`
- Create: `src/effects/effectEngine.ts`
- Test: `tests/effects/effectEngine.test.ts`

- [ ] **Step 1: Write failing effect engine tests**

```ts
// tests/effects/effectEngine.test.ts
import { describe, expect, it } from "vitest";
import { EffectEngine } from "../../src/effects/effectEngine";
import { MAX_ACTIVE_PARTICLES, MAX_ACTIVE_SHAPES } from "../../src/effects/types";

describe("EffectEngine", () => {
  it("spawns calm geometry without exceeding active caps", () => {
    const engine = new EffectEngine({ width: 800, height: 600, seed: 1 });

    for (let i = 0; i < 200; i += 1) {
      engine.spawnForKey("KeyA");
    }

    expect(engine.activeShapeCount).toBeLessThanOrEqual(MAX_ACTIVE_SHAPES);
    expect(engine.activeParticleCount).toBeLessThanOrEqual(MAX_ACTIVE_PARTICLES);
    expect(engine.effects.length).toBe(engine.activeShapeCount + engine.activeParticleCount);
  });

  it("expires effects and returns them to pools", () => {
    const engine = new EffectEngine({ width: 800, height: 600, seed: 2 });
    engine.spawnForKey("KeyB");

    const initiallyActive = engine.effects.length;
    expect(initiallyActive).toBeGreaterThan(0);

    engine.update(5000);

    expect(engine.effects.length).toBe(0);
    expect(engine.inactiveShapePoolCount + engine.inactiveParticlePoolCount).toBe(initiallyActive);
  });

  it("keeps positions inside a loose viewport envelope", () => {
    const engine = new EffectEngine({ width: 320, height: 200, seed: 3 });
    engine.spawnForKey("Space");
    engine.update(250);

    for (const effect of engine.effects) {
      expect(effect.x).toBeGreaterThanOrEqual(-120);
      expect(effect.x).toBeLessThanOrEqual(440);
      expect(effect.y).toBeGreaterThanOrEqual(-120);
      expect(effect.y).toBeLessThanOrEqual(320);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npx vitest run tests/effects/effectEngine.test.ts
```

Expected: FAIL with a module resolution error for `src/effects/effectEngine`.

- [ ] **Step 3: Implement the effect engine**

```ts
// src/effects/effectEngine.ts
import { Effect, EffectKind, MAX_ACTIVE_PARTICLES, MAX_ACTIVE_SHAPES } from "./types";
import { ObjectPool } from "./objectPool";

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
    for (let i = 0; i < code.length; i += 1) hash = (hash * 31 + code.charCodeAt(i)) >>> 0;
    const x = this.width * (0.25 + (hash % 50) / 100);
    const y = this.height * (0.3 + ((hash >> 8) % 40) / 100);
    return { x, y };
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
```

- [ ] **Step 4: Run effect engine tests**

Run:

```powershell
npx vitest run tests/effects/effectEngine.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run all current tests**

Run:

```powershell
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit when a git repository exists**

Run:

```powershell
if (Test-Path .git) {
  git add src/effects/types.ts src/effects/effectEngine.ts tests/effects/effectEngine.test.ts
  git commit -m "feat: add bounded calm geometry engine"
}
```

Expected: in a git repository, a focused effect engine commit is created.

## Task 4: Implement Esc Long-Press Controller

**Files:**
- Create: `src/exit/EscHoldController.ts`
- Test: `tests/exit/EscHoldController.test.ts`

- [ ] **Step 1: Write failing exit controller tests**

```ts
// tests/exit/EscHoldController.test.ts
import { describe, expect, it, vi } from "vitest";
import { EscHoldController } from "../../src/exit/EscHoldController";

describe("EscHoldController", () => {
  it("fires exit after Esc is held for 3 seconds", () => {
    const onExit = vi.fn();
    const controller = new EscHoldController(onExit, 3000);

    controller.keyDown("Escape", 1000);
    controller.update(2500);
    expect(onExit).not.toHaveBeenCalled();

    controller.update(4000);
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("cancels progress when Esc is released early", () => {
    const onExit = vi.fn();
    const controller = new EscHoldController(onExit, 3000);

    controller.keyDown("Escape", 1000);
    controller.update(2500);
    controller.keyUp("Escape");
    controller.update(5000);

    expect(controller.progress).toBe(0);
    expect(onExit).not.toHaveBeenCalled();
  });

  it("ignores non-Esc keys for exit progress", () => {
    const onExit = vi.fn();
    const controller = new EscHoldController(onExit, 3000);

    controller.keyDown("KeyA", 1000);
    controller.update(5000);

    expect(controller.progress).toBe(0);
    expect(onExit).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npx vitest run tests/exit/EscHoldController.test.ts
```

Expected: FAIL with a module resolution error for `src/exit/EscHoldController`.

- [ ] **Step 3: Implement the controller**

```ts
// src/exit/EscHoldController.ts
export class EscHoldController {
  private startMs: number | null = null;
  private fired = false;
  private currentProgress = 0;

  constructor(
    private readonly onExit: () => void,
    private readonly holdMs = 3000
  ) {}

  get isHolding(): boolean {
    return this.startMs !== null && !this.fired;
  }

  get progress(): number {
    return this.currentProgress;
  }

  keyDown(key: string, nowMs: number): void {
    if (key !== "Escape" || this.fired) return;
    if (this.startMs === null) {
      this.startMs = nowMs;
      this.currentProgress = 0;
    }
  }

  keyUp(key: string): void {
    if (key !== "Escape" || this.fired) return;
    this.startMs = null;
    this.currentProgress = 0;
  }

  update(nowMs: number): void {
    if (this.startMs === null || this.fired) return;

    const elapsed = nowMs - this.startMs;
    this.currentProgress = Math.min(1, Math.max(0, elapsed / this.holdMs));

    if (elapsed >= this.holdMs) {
      this.fired = true;
      this.currentProgress = 1;
      this.onExit();
    }
  }
}
```

- [ ] **Step 4: Run exit controller tests**

Run:

```powershell
npx vitest run tests/exit/EscHoldController.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run all current tests**

Run:

```powershell
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit when a git repository exists**

Run:

```powershell
if (Test-Path .git) {
  git add src/exit/EscHoldController.ts tests/exit/EscHoldController.test.ts
  git commit -m "feat: add esc hold exit controller"
}
```

Expected: in a git repository, a focused exit controller commit is created.

## Task 5: Build Canvas Renderer

**Files:**
- Create: `src/index.html`
- Create: `src/styles.css`
- Create: `src/renderer.ts`
- Create: `src/platform/AppBridge.ts`

- [ ] **Step 1: Create the renderer host and styles**

```html
<!-- src/index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Children Keyboard Controller</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <canvas id="visual-canvas" aria-hidden="true"></canvas>
    <div id="exit-progress" aria-hidden="true"></div>
    <script type="module" src="./renderer.ts"></script>
  </body>
</html>
```

```css
/* src/styles.css */
html,
body {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: #070b0e;
  cursor: none;
  user-select: none;
}

#visual-canvas {
  display: block;
  width: 100vw;
  height: 100vh;
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
    conic-gradient(rgba(150, 190, 175, 0.55) var(--progress, 0deg), rgba(255, 255, 255, 0.07) 0),
    radial-gradient(circle at center, #070b0e 56%, transparent 58%);
  transition: opacity 120ms ease;
}

#exit-progress.visible {
  opacity: 1;
}
```

- [ ] **Step 2: Create renderer bridge types**

```ts
// src/platform/AppBridge.ts
export type AppBridge = {
  requestExit: () => void;
};

declare global {
  interface Window {
    appBridge?: AppBridge;
  }
}
```

- [ ] **Step 3: Create canvas renderer wiring**

```ts
// src/renderer.ts
import "./platform/AppBridge";
import { Effect } from "./effects/types";
import { EffectEngine } from "./effects/effectEngine";
import { EscHoldController } from "./exit/EscHoldController";

const canvas = document.querySelector<HTMLCanvasElement>("#visual-canvas");
const exitProgress = document.querySelector<HTMLDivElement>("#exit-progress");

if (!canvas || !exitProgress) {
  throw new Error("Renderer host elements are missing");
}

const context = canvas.getContext("2d", { alpha: false });
if (!context) {
  throw new Error("2D canvas context is unavailable");
}

let width = 0;
let height = 0;
let lastFrame = performance.now();

const engine = new EffectEngine({ width: window.innerWidth, height: window.innerHeight });
const exitController = new EscHoldController(() => {
  window.appBridge?.requestExit();
});

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  engine.resize(width, height);
}

function drawEffect(effect: Effect): void {
  context.save();
  context.globalAlpha = effect.alpha;
  context.translate(effect.x, effect.y);
  context.rotate(effect.rotation);
  context.fillStyle = effect.color;

  if (effect.kind === "circle" || effect.kind === "particle") {
    context.beginPath();
    context.arc(0, 0, effect.size / 2, 0, Math.PI * 2);
    context.fill();
  } else if (effect.kind === "square") {
    const half = effect.size / 2;
    context.beginPath();
    context.roundRect(-half, -half, effect.size, effect.size, Math.min(10, half));
    context.fill();
  } else {
    const half = effect.size / 2;
    context.beginPath();
    context.moveTo(0, -half);
    context.lineTo(half * 0.86, half);
    context.lineTo(-half * 0.86, half);
    context.closePath();
    context.fill();
  }

  context.restore();
}

function render(now: number): void {
  const delta = Math.min(50, now - lastFrame);
  lastFrame = now;
  exitController.update(now);
  engine.update(delta);

  context.fillStyle = "#070b0e";
  context.fillRect(0, 0, width, height);

  for (const effect of engine.effects) {
    drawEffect(effect);
  }

  if (exitController.isHolding) {
    exitProgress.classList.add("visible");
    exitProgress.style.setProperty("--progress", `${Math.round(exitController.progress * 360)}deg`);
  } else {
    exitProgress.classList.remove("visible");
    exitProgress.style.setProperty("--progress", "0deg");
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

window.addEventListener("resize", resize);
window.addEventListener("keydown", swallowKeyboardEvent, { capture: true });
window.addEventListener("keyup", swallowKeyboardEvent, { capture: true });
window.addEventListener("contextmenu", event => event.preventDefault());

resize();
requestAnimationFrame(render);
```

- [ ] **Step 4: Typecheck renderer code**

Run:

```powershell
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Run renderer build**

Run:

```powershell
npm run build:renderer
```

Expected: Vite writes `dist/index.html` and renderer assets.

- [ ] **Step 6: Commit when a git repository exists**

Run:

```powershell
if (Test-Path .git) {
  git add src/index.html src/styles.css src/renderer.ts src/platform/AppBridge.ts
  git commit -m "feat: add calm geometry renderer"
}
```

Expected: in a git repository, a focused renderer commit is created.

## Task 6: Add Electron Main, Preload, And IPC

**Files:**
- Create: `electron/main.ts`
- Create: `electron/preload.ts`
- Create: `electron/keyboard/KeyboardBlocker.ts`
- Create: `electron/keyboard/WindowsKeyboardBlocker.ts`

- [ ] **Step 1: Create keyboard blocker interface and adapter shell**

```ts
// electron/keyboard/KeyboardBlocker.ts
export type KeyboardBlocker = {
  start(): Promise<void>;
  stop(): Promise<void>;
};
```

```ts
// electron/keyboard/WindowsKeyboardBlocker.ts
import { createRequire } from "node:module";
import path from "node:path";
import { app } from "electron";
import { KeyboardBlocker } from "./KeyboardBlocker.js";

type NativeKeyboardBlocker = {
  startBlocking(): void;
  stopBlocking(): void;
};

export class WindowsKeyboardBlocker implements KeyboardBlocker {
  private nativeModule: NativeKeyboardBlocker | null = null;
  private running = false;

  async start(): Promise<void> {
    if (process.platform !== "win32" || this.running) return;
    this.nativeModule = this.loadNativeModule();
    this.nativeModule.startBlocking();
    this.running = true;
  }

  async stop(): Promise<void> {
    if (!this.running || !this.nativeModule) return;
    this.nativeModule.stopBlocking();
    this.running = false;
  }

  private loadNativeModule(): NativeKeyboardBlocker {
    const require = createRequire(import.meta.url);
    const devPath = path.resolve(process.cwd(), "native/keyboard-blocker/build/Release/keyboard_blocker.node");
    const packagedPath = path.join(process.resourcesPath, "app.asar.unpacked/native/keyboard-blocker/build/Release/keyboard_blocker.node");
    const modulePath = app.isPackaged ? packagedPath : devPath;
    return require(modulePath) as NativeKeyboardBlocker;
  }
}
```

- [ ] **Step 2: Create preload bridge**

```ts
// electron/preload.ts
import { contextBridge, ipcRenderer } from "electron";
import type { AppBridge } from "../src/platform/AppBridge.js";

const bridge: AppBridge = {
  requestExit: () => ipcRenderer.send("request-exit")
};

contextBridge.exposeInMainWorld("appBridge", bridge);
```

- [ ] **Step 3: Create Electron main process**

```ts
// electron/main.ts
import { app, BrowserWindow, ipcMain, Menu } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WindowsKeyboardBlocker } from "./keyboard/WindowsKeyboardBlocker.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
const keyboardBlocker = new WindowsKeyboardBlocker();

async function createWindow(): Promise<void> {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    fullscreen: true,
    frame: false,
    kiosk: false,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    backgroundColor: "#070b0e",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.setAlwaysOnTop(true, "screen-saver");
  mainWindow.setMenuBarVisibility(false);

  mainWindow.on("blur", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.focus();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    await mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  try {
    await keyboardBlocker.start();
  } catch (error) {
    console.error("Keyboard blocker failed to start:", error);
  }
}

ipcMain.on("request-exit", async () => {
  await shutdown();
});

async function shutdown(): Promise<void> {
  try {
    await keyboardBlocker.stop();
  } finally {
    app.quit();
  }
}

app.on("window-all-closed", async () => {
  await shutdown();
});

app.on("before-quit", async () => {
  await keyboardBlocker.stop();
});

app.whenReady().then(createWindow);
```

- [ ] **Step 4: Typecheck Electron code**

Run:

```powershell
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Build main and preload**

Run:

```powershell
npm run build:main
npm run build:preload
```

Expected: `dist-electron/main.js` and `dist-electron/preload.cjs` are created.

- [ ] **Step 6: Commit when a git repository exists**

Run:

```powershell
if (Test-Path .git) {
  git add electron/main.ts electron/preload.ts electron/keyboard/KeyboardBlocker.ts electron/keyboard/WindowsKeyboardBlocker.ts
  git commit -m "feat: add electron fullscreen shell"
}
```

Expected: in a git repository, a focused Electron shell commit is created.

## Task 7: Add Windows Keyboard Blocker Native Addon

**Files:**
- Create: `native/keyboard-blocker/binding.gyp`
- Create: `native/keyboard-blocker/keyboard_blocker.cc`
- Modify: `package.json`

- [ ] **Step 1: Create node-gyp binding config**

```json
{
  "targets": [
    {
      "target_name": "keyboard_blocker",
      "sources": ["keyboard_blocker.cc"],
      "include_dirs": ["<!@(node -p \"require('node-addon-api').include\")"],
      "dependencies": ["<!(node -p \"require('node-addon-api').gyp\")"],
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
      "conditions": [
        ["OS=='win'", {
          "libraries": ["user32.lib"]
        }]
      ]
    }
  ]
}
```

- [ ] **Step 2: Create Windows hook implementation**

```cpp
// native/keyboard-blocker/keyboard_blocker.cc
#include <napi.h>
#include <windows.h>
#include <atomic>
#include <thread>

namespace {
std::atomic<bool> running(false);
std::thread hookThread;
HHOOK keyboardHook = nullptr;
DWORD hookThreadId = 0;

bool IsPressed(int virtualKey) {
  return (GetAsyncKeyState(virtualKey) & 0x8000) != 0;
}

bool IsBlockedKey(DWORD vkCode) {
  const bool altDown = IsPressed(VK_MENU);
  const bool ctrlDown = IsPressed(VK_CONTROL);
  const bool shiftDown = IsPressed(VK_SHIFT);

  if (vkCode == VK_LWIN || vkCode == VK_RWIN) return true;
  if (altDown && (vkCode == VK_TAB || vkCode == VK_F4 || vkCode == VK_ESCAPE || vkCode == VK_SPACE)) return true;
  if (ctrlDown && (vkCode == VK_ESCAPE || vkCode == VK_TAB || vkCode == VK_SPACE)) return true;
  if (ctrlDown && shiftDown && vkCode == VK_ESCAPE) return true;
  if (ctrlDown && vkCode >= 0x41 && vkCode <= 0x5A) return true;
  if (vkCode >= VK_F1 && vkCode <= VK_F12) return true;
  return false;
}

LRESULT CALLBACK LowLevelKeyboardProc(int nCode, WPARAM wParam, LPARAM lParam) {
  if (nCode == HC_ACTION) {
    KBDLLHOOKSTRUCT* info = reinterpret_cast<KBDLLHOOKSTRUCT*>(lParam);
    if (IsBlockedKey(info->vkCode)) {
      return 1;
    }
  }
  return CallNextHookEx(keyboardHook, nCode, wParam, lParam);
}

void HookLoop() {
  hookThreadId = GetCurrentThreadId();
  keyboardHook = SetWindowsHookExW(WH_KEYBOARD_LL, LowLevelKeyboardProc, GetModuleHandleW(nullptr), 0);

  MSG msg;
  while (running.load() && GetMessageW(&msg, nullptr, 0, 0) > 0) {
    TranslateMessage(&msg);
    DispatchMessageW(&msg);
  }

  if (keyboardHook != nullptr) {
    UnhookWindowsHookEx(keyboardHook);
    keyboardHook = nullptr;
  }
}
}

Napi::Value StartBlocking(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (running.load()) return env.Undefined();

  running.store(true);
  hookThread = std::thread(HookLoop);
  return env.Undefined();
}

Napi::Value StopBlocking(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!running.load()) return env.Undefined();

  running.store(false);
  if (hookThreadId != 0) {
    PostThreadMessageW(hookThreadId, WM_QUIT, 0, 0);
  }
  if (hookThread.joinable()) {
    hookThread.join();
  }
  hookThreadId = 0;
  return env.Undefined();
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("startBlocking", Napi::Function::New(env, StartBlocking));
  exports.Set("stopBlocking", Napi::Function::New(env, StopBlocking));
  return exports;
}

NODE_API_MODULE(keyboard_blocker, Init)
```

- [ ] **Step 3: Mark native addon as unpacked in Electron Builder**

Ensure `package.json` build config includes:

```json
{
  "build": {
    "asarUnpack": [
      "native/keyboard-blocker/build/Release/keyboard_blocker.node"
    ]
  }
}
```

- [ ] **Step 4: Build native addon**

Run:

```powershell
npm run build:native
```

Expected on Windows with Visual Studio Build Tools installed: `native/keyboard-blocker/build/Release/keyboard_blocker.node` exists.

- [ ] **Step 5: Run typecheck and tests**

Run:

```powershell
npm run typecheck
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit when a git repository exists**

Run:

```powershell
if (Test-Path .git) {
  git add package.json native/keyboard-blocker/binding.gyp native/keyboard-blocker/keyboard_blocker.cc
  git commit -m "feat: add windows keyboard blocker"
}
```

Expected: in a git repository, a focused native blocker commit is created.

## Task 8: Add Manual Windows Verification Checklist

**Files:**
- Create: `docs/manual-windows-verification.md`

- [ ] **Step 1: Create manual verification document**

```md
# Manual Windows Verification

Run these checks on the Windows machine that will run the app.

## Launch

- Run `npm run dev`.
- Confirm the app opens full-screen with no border or menu.
- Confirm the cursor is hidden over the app.

## Keyboard Suppression

- Press letters, numbers, arrows, and space repeatedly. Expected: the app only shows soft geometry effects.
- Press `Alt+F4`. Expected: the app stays open.
- Press `Alt+Tab`. Expected: switching is blocked or focus returns immediately to the app.
- Press the left and right Windows keys. Expected: the Start menu does not remain open.
- Press `Ctrl+L`, `Ctrl+R`, `Ctrl+W`, and `Ctrl+Shift+I`. Expected: no browser location bar, reload, close, or devtools action occurs.
- Press `Ctrl+Alt+Del`. Expected: Windows security screen may appear; this is outside normal app control.

## Exit

- Tap `Esc` briefly. Expected: the app does not exit and no exit progress ring remains visible.
- Hold `Esc` for 2 seconds and release. Expected: progress cancels and the app remains open.
- Hold `Esc` for 3 seconds. Expected: the app exits cleanly.
- After exit, press normal keys in another app. Expected: the keyboard works normally.

## Resource Use

- Mash keys continuously for 60 seconds.
- Confirm the visual density remains bounded.
- Confirm memory does not grow continuously after effects fade.
- Confirm CPU returns to a stable idle level after input stops.
```

- [ ] **Step 2: Commit when a git repository exists**

Run:

```powershell
if (Test-Path .git) {
  git add docs/manual-windows-verification.md
  git commit -m "docs: add windows verification checklist"
}
```

Expected: in a git repository, a focused docs commit is created.

## Task 9: Full Build And Local Run

**Files:**
- Modify only if verification reveals a specific failing line in files from prior tasks.

- [ ] **Step 1: Run full automated verification**

Run:

```powershell
npm run build
```

Expected: tests pass, native addon builds, Electron main/preload compile, renderer builds.

- [ ] **Step 2: Start development app**

Run:

```powershell
npm run dev
```

Expected: app opens full-screen. Use the manual verification checklist, then exit by holding `Esc` for 3 seconds.

- [ ] **Step 3: Package app directory**

Run:

```powershell
npm run pack
```

Expected: Electron Builder creates an unpacked Windows app directory under `dist`.

- [ ] **Step 4: Commit when a git repository exists**

Run:

```powershell
if (Test-Path .git) {
  git status --short
}
```

Expected: no unintended files are staged. Commit only concrete fixes made during verification with a message that names the fix.

## Self-Review

- Spec coverage: Windows-only app, full-screen surface, keyboard suppression, calm geometry, object pooling, active caps, 3-second `Esc` exit, build scripts, tests, and manual verification are covered by Tasks 1-9.
- Placeholder scan: the plan contains no unfinished sections or vague error-handling instructions.
- Type consistency: `EffectEngine`, `ObjectPool`, `EscHoldController`, `AppBridge`, `KeyboardBlocker`, and `WindowsKeyboardBlocker` names are consistent across tests, implementation snippets, and build steps.

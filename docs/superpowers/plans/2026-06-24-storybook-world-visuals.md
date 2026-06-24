# Storybook World Visuals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace abstract keypress geometry with a pale, cute, minimal storybook ground world inspired by the approved A direction and the provided children's picture-book references.

**Architecture:** Keep the existing Electron and canvas runtime. Change the effect model from generic geometry to bounded pooled world items, then render those items in layered 2D canvas primitives with hand-drawn style strokes and soft fills.

**Tech Stack:** Electron, TypeScript, Vite, Vitest, Node native keyboard/focus addon unchanged, Canvas 2D.

---

## File Structure

- Modify `src/effects/types.ts`: add world item kinds and roles while keeping caps.
- Modify `src/effects/effectEngine.ts`: spawn item groups such as houses, trees, hills, clouds, flowers, leaves, and sparkles; keep object pooling and cleanup.
- Modify `src/visual/palette.ts`: replace dark palette with pale white-beige storybook colors.
- Modify `src/visual/AtmosphereField.ts`: draw pale paper/sky wash and soft ground bands.
- Modify `src/visual/CanvasRenderer.ts`: replace abstract shape drawing with layered storybook drawing primitives.
- Modify `src/styles.css` and `electron/main.ts`: sync window/CSS background color.
- Modify `tests/visual/palette.test.ts`: enforce pale white-beige brightness.
- Modify `tests/effects/effectEngine.test.ts`: assert key presses create recognizable world item roles and remain bounded.

---

### Task 1: Palette and World Item Test Coverage

**Files:**
- Modify: `tests/visual/palette.test.ts`
- Modify: `tests/effects/effectEngine.test.ts`
- Modify: `src/effects/types.ts`

- [ ] **Step 1: Update palette test to require pale warm background**

Change `tests/visual/palette.test.ts` so `visualPalette.background` has high luminance, warm ordering, and is not pure white:

```ts
expect(luminance(rgb)).toBeGreaterThanOrEqual(218);
expect(luminance(rgb)).toBeLessThanOrEqual(248);
expect(rgb.r).toBeGreaterThanOrEqual(rgb.g);
expect(rgb.g).toBeGreaterThan(rgb.b);
```

- [ ] **Step 2: Add world item role assertions**

Add a test in `tests/effects/effectEngine.test.ts`:

```ts
it("spawns recognizable storybook world items for key presses", () => {
  const engine = new EffectEngine({ width: 900, height: 600, seed: 21 });

  for (let i = 0; i < 12; i += 1) {
    engine.spawnForKey(`Key${i}`);
  }

  const kinds = new Set(engine.effects.map(effect => effect.kind));
  expect(kinds.has("house") || kinds.has("tree") || kinds.has("hill")).toBe(true);
  expect(kinds.has("sparkle") || kinds.has("leaf") || kinds.has("flower")).toBe(true);
  expect(engine.effects.every(effect => effect.y >= 0 && effect.y <= 600)).toBe(true);
});
```

- [ ] **Step 3: Run tests and verify they fail**

Run: `npx vitest run tests/visual/palette.test.ts tests/effects/effectEngine.test.ts --no-color`

Expected: FAIL because existing palette is too dark and existing effect kinds do not include storybook world items.

---

### Task 2: Effect Model and Spawning

**Files:**
- Modify: `src/effects/types.ts`
- Modify: `src/effects/effectEngine.ts`

- [ ] **Step 1: Add item kinds**

Change `EffectKind` to:

```ts
export type EffectKind =
  | "house"
  | "tree"
  | "hill"
  | "cloud"
  | "flower"
  | "leaf"
  | "pathStone"
  | "sparkle";
```

Keep roles simple:

```ts
export type EffectRole = "ground" | "midground" | "sky" | "detail" | "sparkle";
```

- [ ] **Step 2: Replace generic spawn group with storybook groups**

Update `spawnForKey` so each key creates:

- one anchor
- one primary item chosen by hash/random among `house`, `tree`, `hill`, `cloud`
- two to five supporting details chosen among `flower`, `leaf`, `pathStone`, `sparkle`

Use ground-biased centers:

```ts
const center = this.spawnCenter(code);
const groupRoll = this.random();
if (groupRoll < 0.28) this.spawnWorldItem(center.x, center.y, "house", "midground");
else if (groupRoll < 0.56) this.spawnWorldItem(center.x, center.y, "tree", "midground");
else if (groupRoll < 0.78) this.spawnWorldItem(center.x, center.y, "hill", "ground");
else this.spawnWorldItem(center.x, this.height * (0.16 + this.random() * 0.18), "cloud", "sky");
```

- [ ] **Step 3: Implement `spawnWorldItem`**

Use pooled `Effect` objects. Set long TTL for world items and short TTL for sparkles/leaves:

```ts
effect.ttlMs = role === "sparkle" ? 1800 + this.random() * 1200 : 9000 + this.random() * 6000;
effect.startSize = baseSize * 0.2;
effect.endSize = baseSize;
effect.alpha = 0;
```

- [ ] **Step 4: Update motion**

Use a grow-in ease for the first part of lifetime, then slow fade:

```ts
const appear = Math.min(1, t / 0.18);
const settle = 1 - Math.pow(1 - appear, 3);
effect.size = effect.startSize + (effect.endSize - effect.startSize) * settle;
effect.alpha = Math.min(effect.maxAlpha, effect.maxAlpha * appear) * (1 - Math.max(0, t - 0.74) / 0.26);
```

Use existing `alpha` as current alpha and add no new required field unless needed.

- [ ] **Step 5: Run targeted tests**

Run: `npx vitest run tests/effects/effectEngine.test.ts --no-color`

Expected: PASS.

---

### Task 3: Pale Background and Atmosphere

**Files:**
- Modify: `src/visual/palette.ts`
- Modify: `src/visual/AtmosphereField.ts`
- Modify: `src/styles.css`
- Modify: `electron/main.ts`

- [ ] **Step 1: Set palette**

Use this palette base:

```ts
background: "#fff4d8",
backgroundSoft: "#f8e8bf",
outline: "rgba(76, 63, 45, 0.52)",
ground: "#eadba9",
groundShadow: "rgba(194, 159, 93, 0.18)",
sage: "#bfd39b",
leafYellow: "#f4d66b",
peach: "#f2b57d",
clay: "#c98668",
skyBlue: "#b7d6df",
cream: "#fffaf0"
```

- [ ] **Step 2: Draw paper/ground atmosphere**

Update `AtmosphereField.draw` to:

- fill background with `background`
- draw a faint pale-blue sky wash near the top
- draw two or three rolling ground bands from mid-screen downward
- draw sparse short grass strokes and paper texture lines with low alpha

- [ ] **Step 3: Sync CSS and Electron background**

Set both `src/styles.css` body and `electron/main.ts` `backgroundColor` to `#fff4d8`.

- [ ] **Step 4: Run palette test**

Run: `npx vitest run tests/visual/palette.test.ts --no-color`

Expected: PASS.

---

### Task 4: Storybook Canvas Renderer

**Files:**
- Modify: `src/visual/CanvasRenderer.ts`

- [ ] **Step 1: Replace abstract draw calls**

In `draw`, keep atmosphere first, then draw:

```ts
this.drawWorldItems("ground");
this.drawWorldItems("midground");
this.drawWorldItems("sky");
this.drawWorldItems("detail");
this.drawWorldItems("sparkle");
```

- [ ] **Step 2: Implement item dispatch**

Use `effect.kind` to call:

- `drawHill`
- `drawHouse`
- `drawTree`
- `drawCloud`
- `drawFlower`
- `drawLeaf`
- `drawPathStone`
- `drawSparkle`

- [ ] **Step 3: Use hand-drawn primitives**

Every major object should use:

- soft fill
- thin rounded outline
- subtle interior shade
- simple child-friendly proportions

Examples:

```ts
context.lineCap = "round";
context.lineJoin = "round";
context.strokeStyle = visualPalette.outline;
context.lineWidth = Math.max(1, effect.size * 0.025);
```

- [ ] **Step 4: Keep visual caps and no assets**

Do not load image files or generate runtime bitmaps. Draw all objects from canvas primitives so packaging stays simple.

- [ ] **Step 5: Run renderer-related checks**

Run: `npm run typecheck`

Expected: PASS.

---

### Task 5: Full Verification and Packaging

**Files:**
- No new source files expected.

- [ ] **Step 1: Run all tests**

Run: `npm test -- --no-color`

Expected: all tests pass.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: exit 0.

- [ ] **Step 3: Build packaged app**

Run: `npm run pack`

Expected: `dist/win-unpacked/Children Keyboard Controller.exe` is generated.

- [ ] **Step 4: Smoke screenshot**

Launch the packaged exe, capture a screenshot, and verify the screen reads as pale storybook ground world. Record the screenshot path and center pixel.

- [ ] **Step 5: Commit implementation**

Commit source and tests only. Do not commit smoke screenshots or `.superpowers/` companion files.

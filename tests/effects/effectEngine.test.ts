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

    engine.update(17000);

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

  it("spawns recognizable storybook world items for key presses", () => {
    const engine = new EffectEngine({ width: 900, height: 600, seed: 21 });

    for (let i = 0; i < 12; i += 1) {
      engine.spawnForKey(`Key${i}`);
    }

    const kinds = new Set(engine.effects.map(effect => effect.kind));
    expect(kinds.has("house") || kinds.has("tree") || kinds.has("hill")).toBe(true);
    expect(kinds.has("sparkle") || kinds.has("leaf") || kinds.has("flower")).toBe(true);
    expect(engine.effects.every(effect => effect.x >= 0 && effect.x <= 900)).toBe(true);
    expect(engine.effects.every(effect => effect.y >= 0 && effect.y <= 600)).toBe(true);
  });
});

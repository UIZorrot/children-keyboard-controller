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

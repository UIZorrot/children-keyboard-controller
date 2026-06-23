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

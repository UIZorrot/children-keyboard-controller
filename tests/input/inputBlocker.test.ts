import { describe, expect, it, vi } from "vitest";
import { POINTER_BLOCK_EVENT_TYPES, swallowPointerEvent } from "../../src/input/inputBlocker";

function createEvent(): Event {
  return {
    preventDefault: vi.fn(),
    stopPropagation: vi.fn()
  } as unknown as Event;
}

describe("inputBlocker", () => {
  it("blocks mouse, wheel, touch, and gesture event types", () => {
    expect(POINTER_BLOCK_EVENT_TYPES).toEqual(expect.arrayContaining([
      "mousedown",
      "mouseup",
      "mousemove",
      "click",
      "dblclick",
      "auxclick",
      "wheel",
      "pointerdown",
      "pointermove",
      "pointerup",
      "touchstart",
      "touchmove",
      "touchend",
      "gesturestart",
      "gesturechange",
      "gestureend"
    ]));
  });

  it("prevents pointer-like input from reaching the app", () => {
    const event = createEvent();

    swallowPointerEvent(event);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
  });
});

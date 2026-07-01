export const POINTER_BLOCK_EVENT_TYPES = [
  "mousedown",
  "mouseup",
  "mousemove",
  "mouseenter",
  "mouseleave",
  "mouseover",
  "mouseout",
  "click",
  "dblclick",
  "auxclick",
  "wheel",
  "pointerdown",
  "pointermove",
  "pointerup",
  "pointercancel",
  "touchstart",
  "touchmove",
  "touchend",
  "touchcancel",
  "gesturestart",
  "gesturechange",
  "gestureend",
  "dragstart",
  "selectstart"
] as const;

export function swallowPointerEvent(event: Event): void {
  event.preventDefault();
  event.stopPropagation();
}

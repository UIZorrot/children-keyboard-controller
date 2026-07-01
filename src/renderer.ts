import "./platform/AppBridge";
import { EffectEngine } from "./effects/effectEngine";
import { EscHoldController } from "./exit/EscHoldController";
import { POINTER_BLOCK_EVENT_TYPES, swallowPointerEvent } from "./input/inputBlocker";
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
for (const eventType of POINTER_BLOCK_EVENT_TYPES) {
  window.addEventListener(eventType, swallowPointerEvent, { capture: true, passive: false });
}
window.addEventListener("contextmenu", swallowPointerEvent, { capture: true });

canvasRenderer.resize();
requestAnimationFrame(render);

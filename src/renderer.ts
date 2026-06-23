import "./platform/AppBridge";
import { EffectEngine } from "./effects/effectEngine";
import { Effect } from "./effects/types";
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

const canvasElement = canvas;
const context2d = context;
const exitProgressElement = exitProgress;

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
  canvasElement.width = Math.floor(width * dpr);
  canvasElement.height = Math.floor(height * dpr);
  canvasElement.style.width = `${width}px`;
  canvasElement.style.height = `${height}px`;
  context2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  engine.resize(width, height);
}

function drawEffect(effect: Effect): void {
  context2d.save();
  context2d.globalAlpha = effect.alpha;
  context2d.translate(effect.x, effect.y);
  context2d.rotate(effect.rotation);
  context2d.fillStyle = effect.color;

  if (effect.kind === "circle" || effect.kind === "particle") {
    context2d.beginPath();
    context2d.arc(0, 0, effect.size / 2, 0, Math.PI * 2);
    context2d.fill();
  } else if (effect.kind === "square") {
    const half = effect.size / 2;
    context2d.beginPath();
    context2d.roundRect(-half, -half, effect.size, effect.size, Math.min(10, half));
    context2d.fill();
  } else {
    const half = effect.size / 2;
    context2d.beginPath();
    context2d.moveTo(0, -half);
    context2d.lineTo(half * 0.86, half);
    context2d.lineTo(-half * 0.86, half);
    context2d.closePath();
    context2d.fill();
  }

  context2d.restore();
}

function render(now: number): void {
  const delta = Math.min(50, now - lastFrame);
  lastFrame = now;
  exitController.update(now);
  engine.update(delta);

  context2d.fillStyle = "#070b0e";
  context2d.fillRect(0, 0, width, height);

  for (const effect of engine.effects) {
    drawEffect(effect);
  }

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

window.addEventListener("resize", resize);
window.addEventListener("keydown", swallowKeyboardEvent, { capture: true });
window.addEventListener("keyup", swallowKeyboardEvent, { capture: true });
window.addEventListener("contextmenu", event => event.preventDefault());

resize();
requestAnimationFrame(render);

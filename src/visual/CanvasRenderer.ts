import { EffectEngine } from "../effects/effectEngine";
import { Effect, EffectRole } from "../effects/types";
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
    this.drawWorldItems("ground");
    this.drawWorldItems("sky");
    this.drawWorldItems("midground");
    this.drawWorldItems("detail");
    this.drawWorldItems("sparkle");
  }

  private drawWorldItems(role: EffectRole): void {
    for (const effect of this.engine.effects) {
      if (effect.role !== role) continue;
      if (effect.kind === "hill") this.drawHill(effect);
      else if (effect.kind === "house") this.drawHouse(effect);
      else if (effect.kind === "tree") this.drawTree(effect);
      else if (effect.kind === "cloud") this.drawCloud(effect);
      else if (effect.kind === "flower") this.drawFlower(effect);
      else if (effect.kind === "leaf") this.drawLeaf(effect);
      else if (effect.kind === "pathStone") this.drawPathStone(effect);
      else this.drawSparkle(effect);
    }
  }

  private beginItem(effect: Effect): void {
    this.context.save();
    this.context.globalAlpha = effect.alpha;
    this.context.translate(Math.round(effect.x), Math.round(effect.y));
    this.context.rotate(effect.rotation);
    this.context.lineCap = "round";
    this.context.lineJoin = "round";
    this.context.strokeStyle = visualPalette.outline;
    this.context.lineWidth = Math.max(1, effect.size * 0.022);
  }

  private drawHill(effect: Effect): void {
    this.beginItem(effect);
    const w = effect.size;
    const h = effect.size * 0.42;
    this.context.fillStyle = effect.color;
    this.context.beginPath();
    this.context.moveTo(-w * 0.58, h * 0.34);
    this.context.bezierCurveTo(-w * 0.48, -h * 0.72, -w * 0.08, -h * 0.82, w * 0.16, -h * 0.26);
    this.context.bezierCurveTo(w * 0.34, -h * 0.6, w * 0.6, -h * 0.32, w * 0.62, h * 0.34);
    this.context.closePath();
    this.context.fill();
    this.context.stroke();
    this.context.strokeStyle = visualPalette.fineLine;
    this.context.lineWidth = 1;
    for (let i = 0; i < 4; i += 1) {
      const x = -w * 0.35 + i * w * 0.18;
      this.context.beginPath();
      this.context.moveTo(x, h * 0.04);
      this.context.lineTo(x + w * 0.08, -h * 0.03);
      this.context.stroke();
    }
    this.context.restore();
  }

  private drawHouse(effect: Effect): void {
    this.beginItem(effect);
    const w = effect.size * 0.78;
    const h = effect.size * 0.58;
    const roofH = effect.size * 0.32;
    this.context.fillStyle = effect.color;
    this.context.beginPath();
    this.context.roundRect(-w / 2, -h * 0.2, w, h, Math.min(12, w * 0.18));
    this.context.fill();
    this.context.stroke();

    this.context.fillStyle = visualPalette.clay;
    this.context.beginPath();
    this.context.moveTo(-w * 0.58, -h * 0.18);
    this.context.quadraticCurveTo(0, -h * 0.72 - roofH * 0.25, w * 0.58, -h * 0.18);
    this.context.lineTo(w * 0.46, -h * 0.03);
    this.context.lineTo(-w * 0.46, -h * 0.03);
    this.context.closePath();
    this.context.fill();
    this.context.stroke();

    this.context.fillStyle = visualPalette.windowGlow;
    this.context.beginPath();
    this.context.roundRect(-w * 0.32, h * 0.02, w * 0.18, h * 0.18, 4);
    this.context.fill();
    this.context.stroke();

    this.context.fillStyle = "#8d6f57";
    this.context.beginPath();
    this.context.roundRect(w * 0.12, h * 0.14, w * 0.22, h * 0.32, 8);
    this.context.fill();
    this.context.stroke();
    this.context.restore();
  }

  private drawTree(effect: Effect): void {
    this.beginItem(effect);
    const s = effect.size;
    this.context.fillStyle = "#b6865d";
    this.context.beginPath();
    this.context.roundRect(-s * 0.07, -s * 0.02, s * 0.14, s * 0.42, s * 0.05);
    this.context.fill();
    this.context.stroke();

    this.context.fillStyle = effect.color;
    this.drawPuffyCanopy(0, -s * 0.24, s * 0.7);
    this.context.fill();
    this.context.stroke();

    this.context.strokeStyle = visualPalette.fineLine;
    this.context.lineWidth = 1;
    this.drawShortCurve(-s * 0.18, -s * 0.32, s * 0.05, -s * 0.38);
    this.drawShortCurve(s * 0.12, -s * 0.16, s * 0.28, -s * 0.2);
    this.context.restore();
  }

  private drawCloud(effect: Effect): void {
    this.beginItem(effect);
    const s = effect.size;
    this.context.fillStyle = effect.color;
    this.drawPuffyCanopy(0, 0, s * 0.72);
    this.context.fill();
    this.context.stroke();
    this.context.strokeStyle = visualPalette.fineLine;
    this.context.lineWidth = 1;
    this.drawShortCurve(-s * 0.28, s * 0.1, s * 0.28, s * 0.08);
    this.drawShortCurve(-s * 0.2, s * 0.2, s * 0.2, s * 0.18);
    this.context.restore();
  }

  private drawFlower(effect: Effect): void {
    this.beginItem(effect);
    const r = effect.size * 0.18;
    this.context.fillStyle = effect.color;
    for (let i = 0; i < 5; i += 1) {
      const angle = i / 5 * Math.PI * 2;
      this.context.beginPath();
      this.context.ellipse(Math.cos(angle) * r * 1.45, Math.sin(angle) * r * 1.45, r, r * 0.72, angle, 0, Math.PI * 2);
      this.context.fill();
      this.context.stroke();
    }
    this.context.fillStyle = visualPalette.windowGlow;
    this.context.beginPath();
    this.context.arc(0, 0, r * 0.82, 0, Math.PI * 2);
    this.context.fill();
    this.context.restore();
  }

  private drawLeaf(effect: Effect): void {
    this.beginItem(effect);
    const s = effect.size;
    this.context.fillStyle = effect.color;
    this.context.beginPath();
    this.context.ellipse(0, 0, s * 0.52, s * 0.24, 0.4, 0, Math.PI * 2);
    this.context.fill();
    this.context.stroke();
    this.context.strokeStyle = visualPalette.fineLine;
    this.context.lineWidth = 1;
    this.context.beginPath();
    this.context.moveTo(-s * 0.28, 0);
    this.context.lineTo(s * 0.3, 0);
    this.context.stroke();
    this.context.restore();
  }

  private drawPathStone(effect: Effect): void {
    this.beginItem(effect);
    const s = effect.size;
    this.context.fillStyle = "rgba(189, 160, 103, 0.32)";
    this.context.beginPath();
    this.context.ellipse(0, 0, s * 0.62, s * 0.32, -0.12, 0, Math.PI * 2);
    this.context.fill();
    this.context.stroke();
    this.context.restore();
  }

  private drawSparkle(effect: Effect): void {
    this.beginItem(effect);
    const s = effect.size;
    this.context.strokeStyle = effect.color;
    this.context.lineWidth = Math.max(1, s * 0.14);
    this.context.beginPath();
    this.context.moveTo(-s * 0.42, 0);
    this.context.lineTo(s * 0.42, 0);
    this.context.moveTo(0, -s * 0.42);
    this.context.lineTo(0, s * 0.42);
    this.context.stroke();
    this.context.restore();
  }

  private drawPuffyCanopy(x: number, y: number, size: number): void {
    const r = size * 0.22;
    this.context.beginPath();
    this.context.arc(x - size * 0.28, y + size * 0.04, r * 1.06, Math.PI * 0.72, Math.PI * 1.92);
    this.context.arc(x - size * 0.12, y - size * 0.18, r * 1.18, Math.PI * 1.12, Math.PI * 2.18);
    this.context.arc(x + size * 0.12, y - size * 0.2, r * 1.22, Math.PI * 1.04, Math.PI * 2.12);
    this.context.arc(x + size * 0.32, y + size * 0.02, r * 1.08, Math.PI * 1.2, Math.PI * 2.4);
    this.context.arc(x + size * 0.12, y + size * 0.2, r * 1.28, 0, Math.PI * 0.96);
    this.context.arc(x - size * 0.16, y + size * 0.2, r * 1.24, Math.PI * 0.1, Math.PI * 1.04);
    this.context.closePath();
  }

  private drawShortCurve(x1: number, y1: number, x2: number, y2: number): void {
    this.context.beginPath();
    this.context.moveTo(x1, y1);
    this.context.quadraticCurveTo((x1 + x2) / 2, y1 - 6, x2, y2);
    this.context.stroke();
  }
}

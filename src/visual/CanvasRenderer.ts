import { createConstellationLinks } from "../effects/constellation";
import { EffectEngine } from "../effects/effectEngine";
import { Effect } from "../effects/types";
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
    this.drawConstellation();
    this.drawRipples();
    this.drawShapes();
    this.drawParticles();
  }

  private drawConstellation(): void {
    const links = createConstellationLinks(this.engine.anchors, {
      minDistance: 34,
      maxDistance: Math.min(260, Math.max(this.width, this.height) * 0.28),
      maxLinks: 80
    });
    if (links.length === 0) return;

    this.context.save();
    this.context.strokeStyle = visualPalette.link;
    this.context.lineWidth = 1;
    this.context.beginPath();
    for (const link of links) {
      this.context.globalAlpha = link.alpha;
      this.context.moveTo(Math.round(link.x1), Math.round(link.y1));
      this.context.lineTo(Math.round(link.x2), Math.round(link.y2));
    }
    this.context.stroke();
    this.context.restore();
  }

  private drawRipples(): void {
    for (const effect of this.engine.effects) {
      if (effect.role !== "ripple") continue;
      this.context.save();
      this.context.globalAlpha = effect.alpha;
      this.context.strokeStyle = visualPalette.ripple;
      this.context.lineWidth = 1.4;
      this.context.beginPath();
      this.context.arc(Math.round(effect.x), Math.round(effect.y), effect.size / 2, 0, Math.PI * 2);
      this.context.stroke();
      this.context.restore();
    }
  }

  private drawShapes(): void {
    for (const effect of this.engine.effects) {
      if (effect.role !== "primary" && effect.role !== "secondary") continue;
      this.drawGeometry(effect);
    }
  }

  private drawParticles(): void {
    this.context.save();
    for (const effect of this.engine.effects) {
      if (effect.role !== "particle") continue;
      this.context.globalAlpha = effect.alpha;
      this.context.fillStyle = effect.color;
      this.context.beginPath();
      this.context.arc(Math.round(effect.x), Math.round(effect.y), effect.size / 2, 0, Math.PI * 2);
      this.context.fill();
    }
    this.context.restore();
  }

  private drawGeometry(effect: Effect): void {
    this.context.save();
    this.context.globalAlpha = effect.alpha;
    this.context.translate(Math.round(effect.x), Math.round(effect.y));
    this.context.rotate(effect.rotation);

    const half = effect.size / 2;
    const gradient = this.context.createRadialGradient(-half * 0.3, -half * 0.35, 0, 0, 0, effect.size * 0.78);
    gradient.addColorStop(0, effect.accentColor);
    gradient.addColorStop(0.65, effect.color);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    this.context.fillStyle = gradient;

    if (effect.kind === "circle") {
      this.context.beginPath();
      this.context.arc(0, 0, half, 0, Math.PI * 2);
      this.context.fill();
    } else if (effect.kind === "square") {
      this.context.beginPath();
      this.context.roundRect(-half, -half, effect.size, effect.size, Math.min(16, half));
      this.context.fill();
    } else {
      this.context.beginPath();
      this.context.moveTo(0, -half);
      this.context.lineTo(half * 0.86, half);
      this.context.lineTo(-half * 0.86, half);
      this.context.closePath();
      this.context.fill();
    }

    this.context.restore();
  }
}

import { createConstellationLinks } from "../effects/constellation";
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
  ) { }

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

    // Set global composition to lighter for neon effects
    this.context.globalCompositeOperation = "lighter";

    this.drawConstellation();
    this.drawRipples();
    this.drawShapes("secondary");
    this.drawShapes("primary");
    this.drawParticles();

    this.context.globalCompositeOperation = "source-over";
  }

  private drawConstellation(): void {
    const links = createConstellationLinks(this.engine.anchors, {
      minDistance: 34,
      maxDistance: Math.min(260, Math.max(this.width, this.height) * 0.28),
      maxLinks: 80
    });
    if (links.length === 0) return;

    this.context.save();
    this.context.lineWidth = 2;
    this.context.beginPath();
    for (const link of links) {
      this.context.strokeStyle = visualPalette.link;
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
      this.context.strokeStyle = effect.color;
      this.context.lineWidth = 2; // Thinner
      this.context.shadowBlur = 5; // Reduced glow
      this.context.shadowColor = effect.color;
      this.context.beginPath();
      this.context.arc(Math.round(effect.x), Math.round(effect.y), effect.size / 2, 0, Math.PI * 2);
      this.context.stroke();
      this.context.restore();
    }
  }

  private drawShapes(role: EffectRole): void {
    for (const effect of this.engine.effects) {
      if (effect.role !== role) continue;
      this.drawGeometry(effect);
    }
  }

  private drawParticles(): void {
    this.context.save();
    for (const effect of this.engine.effects) {
      if (effect.role !== "particle") continue;
      this.context.globalAlpha = effect.alpha;
      this.context.fillStyle = effect.color;
      this.context.shadowBlur = 4; // Reduced glow
      this.context.shadowColor = effect.color;
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
    
    // Neon glow effect, reduced for eye safety
    this.context.shadowBlur = effect.role === "primary" ? 10 : 5;
    this.context.shadowColor = effect.color;
    
    // Gradient fill
    const gradient = this.context.createRadialGradient(0, 0, 0, 0, 0, effect.size);
    gradient.addColorStop(0, visualPalette.highlight);
    gradient.addColorStop(0.2, effect.accentColor);
    gradient.addColorStop(1, effect.color);
    
    this.context.fillStyle = gradient;
    this.context.strokeStyle = visualPalette.highlight;
    this.context.lineWidth = 4; // Thicker lines
    this.context.lineJoin = "round"; // Rounded corners for polygons
    this.context.lineCap = "round";

    this.context.beginPath();
    
    if (effect.kind === "circle") {
      this.context.arc(0, 0, half, 0, Math.PI * 2);
    } else if (effect.kind === "square") {
      this.context.roundRect(-half, -half, effect.size, effect.size, Math.min(16, half * 0.3));
    } else if (effect.kind === "triangle") {
      this.context.moveTo(0, -half);
      this.context.lineTo(half * 0.86, half);
      this.context.lineTo(-half * 0.86, half);
      this.context.closePath();
    } else if (effect.kind === "star") {
      this.drawStar(0, 0, 5, half, half * 0.4);
    } else if (effect.kind === "heart") {
      this.drawHeart(0, 0, effect.size);
    } else if (effect.kind === "polygon") {
      this.drawPolygon(0, 0, 6, half); // Hexagon
    } else if (effect.kind === "diamond") {
      this.drawDiamond(0, 0, effect.size);
    }

    this.context.fill();
    this.context.stroke();
    this.context.restore();
  }

  private drawDiamond(cx: number, cy: number, size: number): void {
    const half = size / 2;
    this.context.moveTo(cx, cy - half);
    this.context.lineTo(cx + half * 0.7, cy);
    this.context.lineTo(cx, cy + half);
    this.context.lineTo(cx - half * 0.7, cy);
    this.context.closePath();
  }

  private drawStar(cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): void {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    this.context.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      this.context.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      this.context.lineTo(x, y);
      rot += step;
    }
    this.context.lineTo(cx, cy - outerRadius);
    this.context.closePath();
  }

  private drawHeart(cx: number, cy: number, size: number): void {
    const top = -size * 0.3;
    this.context.moveTo(cx, cy + top);
    this.context.bezierCurveTo(
      cx + size * 0.5, cy - size * 0.6, 
      cx + size * 0.6, cy + size * 0.2, 
      cx, cy + size * 0.45
    );
    this.context.bezierCurveTo(
      cx - size * 0.6, cy + size * 0.2, 
      cx - size * 0.5, cy - size * 0.6, 
      cx, cy + top
    );
  }

  private drawPolygon(cx: number, cy: number, sides: number, radius: number): void {
    this.context.moveTo(cx + radius * Math.cos(0), cy + radius * Math.sin(0));
    for (let i = 1; i <= sides; i += 1) {
      this.context.lineTo(cx + radius * Math.cos(i * 2 * Math.PI / sides), cy + radius * Math.sin(i * 2 * Math.PI / sides));
    }
    this.context.closePath();
  }
}

import { visualPalette } from "./palette";

type Blob = {
  xRatio: number;
  yRatio: number;
  radiusRatio: number;
  phase: number;
  speed: number;
  color: string;
};

const BLOBS: Blob[] = [
  { xRatio: 0.2, yRatio: 0.18, radiusRatio: 0.42, phase: 0, speed: 0.00008, color: visualPalette.atmosphere[0] },
  { xRatio: 0.78, yRatio: 0.2, radiusRatio: 0.34, phase: 2.1, speed: 0.00007, color: visualPalette.atmosphere[1] },
  { xRatio: 0.58, yRatio: 0.72, radiusRatio: 0.42, phase: 4.2, speed: 0.00006, color: visualPalette.atmosphere[2] },
  { xRatio: 0.2, yRatio: 0.82, radiusRatio: 0.3, phase: 5.1, speed: 0.00008, color: visualPalette.atmosphere[3] }
];

function withAlpha(color: string, alpha: number): string {
  return color.replace(/rgba\(([^)]+),\s*[\d.]+\)/, `rgba($1, ${alpha})`);
}

export class AtmosphereField {
  draw(context: CanvasRenderingContext2D, width: number, height: number, nowMs: number): void {
    context.fillStyle = visualPalette.background;
    context.fillRect(0, 0, width, height);

    const sky = context.createLinearGradient(0, 0, 0, height * 0.58);
    sky.addColorStop(0, "rgba(183, 214, 223, 0.42)");
    sky.addColorStop(0.65, "rgba(255, 250, 240, 0.2)");
    sky.addColorStop(1, "rgba(255, 244, 216, 0)");
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height * 0.66);

    for (const blob of BLOBS) {
      const drift = nowMs * blob.speed + blob.phase;
      const x = width * blob.xRatio + Math.cos(drift) * width * 0.025;
      const y = height * blob.yRatio + Math.sin(drift * 0.8) * height * 0.028;
      const radius = Math.max(width, height) * blob.radiusRatio;
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, blob.color);
      gradient.addColorStop(0.52, withAlpha(blob.color, 0.045));
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
    }

    this.drawGroundBand(context, width, height, height * 0.62, height * 0.11, visualPalette.groundSoft, 0);
    this.drawGroundBand(context, width, height, height * 0.72, height * 0.09, visualPalette.ground, 1.8);
    this.drawGroundBand(context, width, height, height * 0.82, height * 0.08, "#e7cf8c", 3.4);
    this.drawPaperTexture(context, width, height);
    this.drawGrassMarks(context, width, height, nowMs);
  }

  private drawGroundBand(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    baseline: number,
    amplitude: number,
    color: string,
    phase: number
  ): void {
    context.save();
    context.fillStyle = color;
    context.globalAlpha = 0.72;
    context.beginPath();
    context.moveTo(0, height);
    context.lineTo(0, baseline);
    for (let x = 0; x <= width + 32; x += 32) {
      const y = baseline + Math.sin(x / width * Math.PI * 2 + phase) * amplitude;
      context.lineTo(x, y);
    }
    context.lineTo(width, height);
    context.closePath();
    context.fill();
    context.restore();
  }

  private drawPaperTexture(context: CanvasRenderingContext2D, width: number, height: number): void {
    context.save();
    context.strokeStyle = "rgba(124, 103, 68, 0.055)";
    context.lineWidth = 1;
    for (let i = 0; i < 36; i += 1) {
      const x = (i * 149) % Math.max(1, width);
      const y = (i * 83) % Math.max(1, height);
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + 16 + (i % 5) * 7, y - 3 + (i % 3) * 3);
      context.stroke();
    }
    context.restore();
  }

  private drawGrassMarks(context: CanvasRenderingContext2D, width: number, height: number, nowMs: number): void {
    context.save();
    context.strokeStyle = "rgba(87, 96, 56, 0.16)";
    context.lineWidth = 1.2;
    context.lineCap = "round";
    const drift = Math.sin(nowMs * 0.0004) * 2;
    for (let i = 0; i < 48; i += 1) {
      const x = (i * 97) % Math.max(1, width);
      const y = height * (0.62 + ((i * 37) % 34) / 100);
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + 8 + drift, y - 5 - (i % 4));
      context.stroke();
    }
    context.restore();
  }
}

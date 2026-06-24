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
  { xRatio: 0.18, yRatio: 0.28, radiusRatio: 0.34, phase: 0, speed: 0.00012, color: visualPalette.atmosphere[0] },
  { xRatio: 0.78, yRatio: 0.24, radiusRatio: 0.38, phase: 2.1, speed: 0.0001, color: visualPalette.atmosphere[1] },
  { xRatio: 0.62, yRatio: 0.74, radiusRatio: 0.42, phase: 4.2, speed: 0.00009, color: visualPalette.atmosphere[2] },
  { xRatio: 0.28, yRatio: 0.82, radiusRatio: 0.3, phase: 5.1, speed: 0.00011, color: visualPalette.atmosphere[3] }
];

function withAlpha(color: string, alpha: number): string {
  return color.replace(/rgba\(([^)]+),\s*[\d.]+\)/, `rgba($1, ${alpha})`);
}

export class AtmosphereField {
  draw(context: CanvasRenderingContext2D, width: number, height: number, nowMs: number): void {
    context.fillStyle = visualPalette.background;
    context.fillRect(0, 0, width, height);

    for (const blob of BLOBS) {
      const drift = nowMs * blob.speed + blob.phase;
      const x = width * blob.xRatio + Math.cos(drift) * width * 0.035;
      const y = height * blob.yRatio + Math.sin(drift * 0.8) * height * 0.04;
      const radius = Math.max(width, height) * blob.radiusRatio;
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, blob.color);
      gradient.addColorStop(0.52, withAlpha(blob.color, 0.055));
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
    }
  }
}

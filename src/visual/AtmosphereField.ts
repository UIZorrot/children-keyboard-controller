import { visualPalette } from "./palette";

type Star = {
  xRatio: number;
  yRatio: number;
  size: number;
  phase: number;
  speed: number;
};

// Generate some random stars for the background
const STARS: Star[] = Array.from({ length: 150 }).map(() => ({
  xRatio: Math.random(),
  yRatio: Math.random(),
  size: Math.random() * 2 + 0.5,
  phase: Math.random() * Math.PI * 2,
  speed: 0.001 + Math.random() * 0.002
}));

type Blob = {
  xRatio: number;
  yRatio: number;
  radiusRatio: number;
  phase: number;
  speed: number;
  color: string;
};

const BLOBS: Blob[] = [
  { xRatio: 0.2, yRatio: 0.2, radiusRatio: 0.45, phase: 0, speed: 0.00008, color: visualPalette.atmosphere[0] },
  { xRatio: 0.8, yRatio: 0.3, radiusRatio: 0.4, phase: 2.1, speed: 0.00007, color: visualPalette.atmosphere[1] },
  { xRatio: 0.6, yRatio: 0.8, radiusRatio: 0.5, phase: 4.2, speed: 0.00006, color: visualPalette.atmosphere[2] },
  { xRatio: 0.3, yRatio: 0.7, radiusRatio: 0.35, phase: 5.1, speed: 0.00008, color: visualPalette.atmosphere[3] }
];

function withAlpha(color: string, alpha: number): string {
  return color.replace(/rgba\(([^)]+),\s*[\d.]+\)/, `rgba($1, ${alpha})`);
}

export class AtmosphereField {
  draw(context: CanvasRenderingContext2D, width: number, height: number, nowMs: number): void {
    // Solid dark background
    context.fillStyle = visualPalette.background;
    context.fillRect(0, 0, width, height);

    // Subtle colorful nebula blobs drifting
    for (const blob of BLOBS) {
      const drift = nowMs * blob.speed + blob.phase;
      const x = width * blob.xRatio + Math.cos(drift) * width * 0.04;
      const y = height * blob.yRatio + Math.sin(drift * 0.8) * height * 0.04;
      const radius = Math.max(width, height) * blob.radiusRatio;
      
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, blob.color);
      gradient.addColorStop(0.5, withAlpha(blob.color, 0.04));
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
    }

    // Twinkling stars
    context.fillStyle = "#ffffff";
    for (const star of STARS) {
      const twinkle = (Math.sin(nowMs * star.speed + star.phase) + 1) / 2;
      context.globalAlpha = 0.1 + twinkle * 0.7; // Base opacity 0.1, up to 0.8
      
      const x = star.xRatio * width;
      const y = star.yRatio * height;
      
      context.beginPath();
      context.arc(x, y, star.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1.0;
  }
}

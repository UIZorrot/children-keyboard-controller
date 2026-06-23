export class EscHoldController {
  private startMs: number | null = null;
  private fired = false;
  private currentProgress = 0;

  constructor(
    private readonly onExit: () => void,
    private readonly holdMs = 3000
  ) {}

  get isHolding(): boolean {
    return this.startMs !== null && !this.fired;
  }

  get progress(): number {
    return this.currentProgress;
  }

  keyDown(key: string, nowMs: number): void {
    if (key !== "Escape" || this.fired) return;
    if (this.startMs === null) {
      this.startMs = nowMs;
      this.currentProgress = 0;
    }
  }

  keyUp(key: string): void {
    if (key !== "Escape" || this.fired) return;
    this.startMs = null;
    this.currentProgress = 0;
  }

  update(nowMs: number): void {
    if (this.startMs === null || this.fired) return;

    const elapsed = nowMs - this.startMs;
    this.currentProgress = Math.min(1, Math.max(0, elapsed / this.holdMs));

    if (elapsed >= this.holdMs) {
      this.fired = true;
      this.currentProgress = 1;
      this.onExit();
    }
  }
}

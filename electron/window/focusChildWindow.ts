export type FocusableWindow = {
  isDestroyed(): boolean;
  isMinimized(): boolean;
  restore(): void;
  setAlwaysOnTop(flag: boolean, level?: string): void;
  show(): void;
  moveTop(): void;
  focus(): void;
  getNativeWindowHandle?(): Buffer;
};

export type FocusableApp = {
  focus(options?: { steal?: boolean }): void;
};

export type ForegroundController = {
  forceForegroundWindow(nativeWindowHandle: Buffer): void;
};

export function focusChildWindow(
  window: FocusableWindow | null,
  app: FocusableApp,
  foregroundController?: ForegroundController
): void {
  if (!window || window.isDestroyed()) return;

  if (window.isMinimized()) {
    window.restore();
  }

  window.setAlwaysOnTop(true, "screen-saver");
  window.show();
  window.moveTop();
  window.focus();
  app.focus({ steal: true });

  if (foregroundController && window.getNativeWindowHandle) {
    foregroundController.forceForegroundWindow(window.getNativeWindowHandle());
  }
}

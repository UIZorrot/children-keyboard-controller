import { describe, expect, it, vi } from "vitest";
import { focusChildWindow, FocusableApp, FocusableWindow } from "../../electron/window/focusChildWindow";

function createWindow(overrides: Partial<FocusableWindow> = {}): FocusableWindow {
  return {
    isDestroyed: vi.fn(() => false),
    isMinimized: vi.fn(() => false),
    restore: vi.fn(),
    setAlwaysOnTop: vi.fn(),
    show: vi.fn(),
    moveTop: vi.fn(),
    focus: vi.fn(),
    getNativeWindowHandle: vi.fn(() => Buffer.from([1, 0, 0, 0])),
    ...overrides
  };
}

function createApp(): FocusableApp {
  return { focus: vi.fn() };
}

describe("focusChildWindow", () => {
  it("restores, shows, focuses, and asks the app to steal focus", () => {
    const window = createWindow();
    const app = createApp();

    focusChildWindow(window, app);

    expect(window.show).toHaveBeenCalledOnce();
    expect(window.focus).toHaveBeenCalledOnce();
    expect(app.focus).toHaveBeenCalledWith({ steal: true });
  });

  it("promotes the window before focusing so it wins activation races", () => {
    const window = createWindow();

    focusChildWindow(window, createApp());

    expect(window.setAlwaysOnTop).toHaveBeenCalledWith(true, "screen-saver");
    expect(window.moveTop).toHaveBeenCalledOnce();
  });

  it("delegates native foreground activation when a controller is provided", () => {
    const handle = Buffer.from([8, 0, 0, 0]);
    const window = createWindow({ getNativeWindowHandle: vi.fn(() => handle) });
    const foregroundController = { forceForegroundWindow: vi.fn() };

    focusChildWindow(window, createApp(), foregroundController);

    expect(foregroundController.forceForegroundWindow).toHaveBeenCalledWith(handle);
  });

  it("restores minimized windows before focusing", () => {
    const window = createWindow({ isMinimized: vi.fn(() => true) });

    focusChildWindow(window, createApp());

    expect(window.restore).toHaveBeenCalledOnce();
  });

  it("does nothing for destroyed windows", () => {
    const window = createWindow({ isDestroyed: vi.fn(() => true) });
    const app = createApp();

    focusChildWindow(window, app);

    expect(window.show).not.toHaveBeenCalled();
    expect(window.focus).not.toHaveBeenCalled();
    expect(app.focus).not.toHaveBeenCalled();
  });
});

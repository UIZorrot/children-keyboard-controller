import { app } from "electron";
import { createRequire } from "node:module";
import path from "node:path";
import { KeyboardBlocker } from "./KeyboardBlocker";

type NativeKeyboardBlocker = {
  startBlocking(): void;
  stopBlocking(): void;
};

export class WindowsKeyboardBlocker implements KeyboardBlocker {
  private nativeModule: NativeKeyboardBlocker | null = null;
  private running = false;

  async start(): Promise<void> {
    if (process.platform !== "win32" || this.running) return;

    this.nativeModule = this.loadNativeModule();
    this.nativeModule.startBlocking();
    this.running = true;
  }

  async stop(): Promise<void> {
    if (!this.running || !this.nativeModule) return;

    this.nativeModule.stopBlocking();
    this.running = false;
  }

  private loadNativeModule(): NativeKeyboardBlocker {
    const require = createRequire(import.meta.url);
    const devPath = path.resolve(process.cwd(), "native/keyboard-blocker/build/Release/keyboard_blocker.node");
    const packagedPath = path.join(
      process.resourcesPath,
      "app.asar.unpacked/native/keyboard-blocker/build/Release/keyboard_blocker.node"
    );
    const modulePath = app.isPackaged ? packagedPath : devPath;
    return require(modulePath) as NativeKeyboardBlocker;
  }
}

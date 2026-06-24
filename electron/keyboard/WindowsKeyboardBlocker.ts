import { KeyboardBlocker } from "./KeyboardBlocker";
import {
  loadNativeKeyboardBlockerModule,
  NativeKeyboardBlockerModule
} from "../native/loadNativeKeyboardBlockerModule";

export class WindowsKeyboardBlocker implements KeyboardBlocker {
  private nativeModule: NativeKeyboardBlockerModule | null = null;
  private running = false;

  async start(): Promise<void> {
    if (process.platform !== "win32" || this.running) return;

    this.nativeModule = loadNativeKeyboardBlockerModule();
    this.nativeModule.startBlocking();
    this.running = true;
  }

  async stop(): Promise<void> {
    if (!this.running || !this.nativeModule) return;

    this.nativeModule.stopBlocking();
    this.running = false;
  }
}

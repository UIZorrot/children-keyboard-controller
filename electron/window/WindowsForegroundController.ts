import {
  loadNativeKeyboardBlockerModule,
  NativeKeyboardBlockerModule
} from "../native/loadNativeKeyboardBlockerModule";
import { ForegroundController } from "./focusChildWindow";

export class WindowsForegroundController implements ForegroundController {
  private nativeModule: NativeKeyboardBlockerModule | null = null;

  forceForegroundWindow(nativeWindowHandle: Buffer): void {
    if (process.platform !== "win32") return;

    if (!this.nativeModule) {
      this.nativeModule = loadNativeKeyboardBlockerModule();
    }

    this.nativeModule.forceForegroundWindow?.(nativeWindowHandle);
  }
}

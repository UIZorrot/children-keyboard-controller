import { app } from "electron";
import { createRequire } from "node:module";
import path from "node:path";

export type NativeKeyboardBlockerModule = {
  startBlocking(): void;
  stopBlocking(): void;
  forceForegroundWindow?(nativeWindowHandle: Buffer): boolean;
};

export function loadNativeKeyboardBlockerModule(): NativeKeyboardBlockerModule {
  const require = createRequire(import.meta.url);
  const devPath = path.resolve(process.cwd(), "native/keyboard-blocker/build/Release/keyboard_blocker.node");
  const packagedPath = path.join(
    process.resourcesPath,
    "app.asar.unpacked/native/keyboard-blocker/build/Release/keyboard_blocker.node"
  );
  const modulePath = app.isPackaged ? packagedPath : devPath;
  return require(modulePath) as NativeKeyboardBlockerModule;
}

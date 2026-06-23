import { contextBridge, ipcRenderer } from "electron";
import type { AppBridge } from "../src/platform/AppBridge";

const bridge: AppBridge = {
  requestExit: () => ipcRenderer.send("request-exit")
};

contextBridge.exposeInMainWorld("appBridge", bridge);

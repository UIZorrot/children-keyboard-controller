import { app, BrowserWindow, ipcMain, Menu } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WindowsKeyboardBlocker } from "./keyboard/WindowsKeyboardBlocker";
import { WindowsForegroundController } from "./window/WindowsForegroundController";
import { focusChildWindow } from "./window/focusChildWindow";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let shuttingDown = false;
let focusKeepAliveTimer: ReturnType<typeof setInterval> | null = null;
const keyboardBlocker = new WindowsKeyboardBlocker();
const foregroundController = new WindowsForegroundController();

function startFocusKeepAlive(): void {
  if (focusKeepAliveTimer) return;

  focusKeepAliveTimer = setInterval(() => {
    if (!shuttingDown) {
      focusChildWindow(mainWindow, app, foregroundController);
    }
  }, 250);
  focusKeepAliveTimer.unref?.();
}

function stopFocusKeepAlive(): void {
  if (!focusKeepAliveTimer) return;

  clearInterval(focusKeepAliveTimer);
  focusKeepAliveTimer = null;
}

async function createWindow(): Promise<void> {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    fullscreen: true,
    frame: false,
    kiosk: false,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    backgroundColor: "#fff4d8",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.setAlwaysOnTop(true, "screen-saver");
  mainWindow.setMenuBarVisibility(false);

  mainWindow.on("blur", () => {
    if (!shuttingDown) {
      setTimeout(() => focusChildWindow(mainWindow, app, foregroundController), 80);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    await mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  focusChildWindow(mainWindow, app, foregroundController);
  setTimeout(() => focusChildWindow(mainWindow, app, foregroundController), 250);
  startFocusKeepAlive();

  try {
    await keyboardBlocker.start();
  } catch (error) {
    console.error("Keyboard blocker failed to start:", error);
  }
}

ipcMain.on("request-exit", () => {
  void shutdown();
});

async function shutdown(): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  stopFocusKeepAlive();

  try {
    await keyboardBlocker.stop();
  } finally {
    app.quit();
  }
}

app.on("window-all-closed", () => {
  void shutdown();
});

app.on("before-quit", () => {
  void keyboardBlocker.stop();
});

app.whenReady().then(createWindow).catch(error => {
  console.error("Failed to create application window:", error);
  void shutdown();
});

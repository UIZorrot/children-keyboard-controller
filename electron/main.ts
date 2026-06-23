import { app, BrowserWindow, ipcMain, Menu } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WindowsKeyboardBlocker } from "./keyboard/WindowsKeyboardBlocker";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let shuttingDown = false;
const keyboardBlocker = new WindowsKeyboardBlocker();

async function createWindow(): Promise<void> {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    fullscreen: true,
    frame: false,
    kiosk: false,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    backgroundColor: "#070b0e",
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
    if (!shuttingDown && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.focus();
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

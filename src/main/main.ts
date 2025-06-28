/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from "path";
import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  Tray,
  Menu,
  globalShortcut, // Added for global shortcuts
  clipboard, // Added for clipboard access
} from "electron";
import { autoUpdater } from "electron-updater";
import log from "electron-log";
import Store from "electron-store";

import MenuBuilder from "./menu";
import { resolveHtmlPath } from "./util";
import { subscribeIPC } from "./bridge";

// Define settings schema and defaults
interface AppSettings {
  showWindowOnStartup: boolean;
  hideToSystemTray: boolean;
  // Persisted UI selections
  selectedModel: string | null;
  sourceLanguageCode: string | null;
  targetLanguageCode: string | null;
  useRefinement: boolean;
}

const store = new Store<AppSettings>({
  defaults: {
    showWindowOnStartup: true,
    hideToSystemTray: true,
    // Defaults for UI selections
    selectedModel: null, // Or a default model name if applicable
    sourceLanguageCode: null, // Or a default source language code
    targetLanguageCode: null, // Or a default target language code
    useRefinement: false,
  },
});

log.info(`App version: ${app.getVersion()}`);

class AppUpdater {
  constructor() {
    log.transports.file.level = "info";
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false; // Flag to indicate if app is actually quitting

ipcMain.on("ipc-example", async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply("ipc-example", msgTemplate("pong"));
});

ipcMain.handle("get-initial-settings", async () => {
  return {
    showWindowOnStartup: store.get("showWindowOnStartup"),
    hideToSystemTray: store.get("hideToSystemTray"),
    selectedModel: store.get("selectedModel"),
    sourceLanguageCode: store.get("sourceLanguageCode"),
    targetLanguageCode: store.get("targetLanguageCode"),
    useRefinement: store.get("useRefinement"),
  };
});

ipcMain.on(
  "settings-updated",
  (event, newSettings: Partial<AppSettings>) => {
    if (newSettings.showWindowOnStartup !== undefined) {
      store.set("showWindowOnStartup", newSettings.showWindowOnStartup);
    }
    if (newSettings.hideToSystemTray !== undefined) {
      store.set("hideToSystemTray", newSettings.hideToSystemTray);
    }
    if (newSettings.selectedModel !== undefined) {
      store.set("selectedModel", newSettings.selectedModel);
    }
    if (newSettings.sourceLanguageCode !== undefined) {
      store.set("sourceLanguageCode", newSettings.sourceLanguageCode);
    }
    if (newSettings.targetLanguageCode !== undefined) {
      store.set("targetLanguageCode", newSettings.targetLanguageCode);
    }
    if (newSettings.useRefinement !== undefined) {
      store.set("useRefinement", newSettings.useRefinement);
    }
    log.info("Settings updated:", store.store);
  },
);

subscribeIPC();

if (process.env.NODE_ENV === "production") {
  const sourceMapSupport = require("source-map-support");
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === "development" || process.env.DEBUG_PROD === "true";

if (isDebug) {
  require("electron-debug")();
}

const installExtensions = async () => {
  const installer = require("electron-devtools-installer");
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ["REACT_DEVELOPER_TOOLS"];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, "assets")
    : path.join(__dirname, "../../assets");

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  const iconPath =
    process.platform === "win32"
      ? getAssetPath("icon.ico")
      : getAssetPath("icon.png");

  mainWindow = new BrowserWindow({
    show: false,
    width: 1280,
    height: 720,
    icon: iconPath, // Use platform-specific icon
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, "preload.js")
        : path.join(__dirname, "../../.erb/dll/preload.js"),
    },
  });

  mainWindow.loadURL(resolveHtmlPath("index.html"));

  mainWindow.on("ready-to-show", () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    const showWindowOnStartupSetting = store.get("showWindowOnStartup");

    if (!showWindowOnStartupSetting) {
      // Do not show the window, it will start minimized to tray
    } else if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.on("close", (event) => {
    if (isQuitting) {
      // If we are intentionally quitting (e.g., via tray menu "Quit"),
      // don't prevent default and allow the window to close.
      return;
    }
    const hideToSystemTraySetting = store.get("hideToSystemTray");
    if (hideToSystemTraySetting && tray) {
      event.preventDefault();
      mainWindow?.hide();
    } else {
      // Allow the app to close normally, which might lead to app quit
      // if this is the last window and not on macOS.
    }
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: "deny" };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  // new AppUpdater();
};

// Removed lastCtrlCPressTime and DOUBLE_PRESS_THRESHOLD as they are no longer needed.

const setupGlobalShortcuts = () => {
  // Register CommandOrControl+Shift+C as the new shortcut
  globalShortcut.register("CommandOrControl+Shift+C", () => {
    // 1. Read selected text.
    const selectedTextFromSelection = clipboard.readText("selection");

    // 2. Send it to the renderer process if mainWindow exists.
    if (selectedTextFromSelection && selectedTextFromSelection.length > 0 && mainWindow) {
      mainWindow.webContents.send("global-shortcut-copy", selectedTextFromSelection);
    }
    // Note: We are NOT writing to the main clipboard here.
    // The goal is to send selected text to the app with this specific shortcut,
    // leaving the standard clipboard (Cmd/Ctrl+C) behavior untouched.
  });
};

const createTray = () => {
  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, "assets")
    : path.join(__dirname, "../../assets");

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  tray = new Tray(getAssetPath("icon.png"));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Quit",
      click: () => {
        isQuitting = true; // Set the flag
        app.quit();
      },
    },
  ]);

  tray.setToolTip("calt"); // Changed tooltip here
  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    if (mainWindow) {
      const hideToSystemTraySetting = store.get("hideToSystemTray");
      if (hideToSystemTraySetting) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      } else {
        if (!mainWindow.isVisible() || mainWindow.isMinimized()) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          mainWindow.focus(); // Or mainWindow.minimize() if preferred when not hiding to tray
        }
      }
    }
  });
};

/**
 * Add event listeners...
 */

app.on("window-all-closed", () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  // Unregister all shortcuts.
  globalShortcut.unregisterAll();
});

app
  .whenReady()
  .then(() => {
    createWindow();
    createTray();
    setupGlobalShortcuts(); // Add this line
    app.on("activate", () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);

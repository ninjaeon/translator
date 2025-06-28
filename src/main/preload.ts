// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import { AppSettings, exposeIPC } from "./bridge"; // Import AppSettings

export type Channels =
  | "ipc-example"
  | "global-shortcut-copy"
  | "settings-updated"; // Added "settings-updated"

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
    // Specific listener for the global shortcut
    onGlobalShortcutCopy(func: (text: string) => void) {
      const subscription = (_event: IpcRendererEvent, text: string) => func(text);
      ipcRenderer.on("global-shortcut-copy", subscription);
      return () => {
        ipcRenderer.removeListener("global-shortcut-copy", subscription);
      };
    }
  },
};

contextBridge.exposeInMainWorld("electron", electronHandler);
exposeIPC();

export type ElectronHandler = typeof electronHandler;

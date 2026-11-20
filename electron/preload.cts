import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  ping: () => "pong",
  printSilent: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("print-silent")
});

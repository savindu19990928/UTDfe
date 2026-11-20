import { app, BrowserWindow, Menu, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs")
    }
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
  } else {
    mainWindow.loadFile(
      path.join(__dirname, "../dist/index.html")
    );
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
});


app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

async function executeSilentPrint(
  webContents: Electron.WebContents
): Promise<{ success: boolean; error?: string }> {
  try {
    if (typeof webContents.getPrintersAsync === "function") {
      const printers: any[] = await webContents.getPrintersAsync();
      if (!printers || printers.length === 0) {
        return {
          success: false,
          error: "No printer found. Please connect or configure a printer."
        };
      }
      const defaultPrinter = printers.find((p: any) => p.isDefault);
      if (defaultPrinter && typeof defaultPrinter.status === "number") {
        if ((defaultPrinter.status & 0x00000080) !== 0) {
          return {
            success: false,
            error: `Printer "${defaultPrinter.displayName || defaultPrinter.name}" is offline. Please check the printer connection.`
          };
        }
        if ((defaultPrinter.status & 0x00000010) !== 0) {
          return {
            success: false,
            error: `Printer "${defaultPrinter.displayName || defaultPrinter.name}" is out of paper.`
          };
        }
        if ((defaultPrinter.status & 0x00000008) !== 0) {
          return {
            success: false,
            error: `Printer "${defaultPrinter.displayName || defaultPrinter.name}" has a paper jam.`
          };
        }
        if ((defaultPrinter.status & 0x00000001) !== 0) {
          return {
            success: false,
            error: `Printer "${defaultPrinter.displayName || defaultPrinter.name}" is paused.`
          };
        }
        if ((defaultPrinter.status & (0x00000002 | 0x00001000 | 0x00100000)) !== 0) {
          return {
            success: false,
            error: `Printer "${defaultPrinter.displayName || defaultPrinter.name}" reported an error. Please check the printer.`
          };
        }
      }
    }
  } catch (err) {
    console.warn("Could not query printers:", err);
  }

  return new Promise((resolve) => {
    let settled = false;
    const done = (result: { success: boolean; error?: string }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(result);
    };

    const timeout = setTimeout(() => {
      done({
        success: false,
        error: "Print request timed out. Please check if your printer is connected and ready."
      });
    }, 15000);

    try {
      webContents.print(
        { silent: true, printBackground: true },
        (success, failureReason) => {
          if (!success) {
            const errorMsg =
              failureReason || "Failed to print. Please check your printer connection.";
            console.error("Silent print failed:", errorMsg);
            done({
              success: false,
              error: errorMsg
            });
          } else {
            done({ success: true });
          }
        }
      );
    } catch (err: any) {
      const errorMsg =
        err?.message || "Failed to print. Please check your printer connection.";
      console.error("Silent print error:", errorMsg);
      done({
        success: false,
        error: errorMsg
      });
    }
  });
}

ipcMain.handle("print-silent", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) {
    return {
      success: false,
      error: "Print window is not available."
    };
  }
  return await executeSilentPrint(win.webContents);
});

ipcMain.on("print-silent", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) {
    event.sender.send("print-silent-error", "Print window is not available.");
    return;
  }
  const result = await executeSilentPrint(win.webContents);
  if (!result.success) {
    event.sender.send(
      "print-silent-error",
      result.error || "Failed to print. Please check your printer connection."
    );
  }
});

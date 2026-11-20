export interface PrintResult {
  success: boolean;
  error?: string;
}

/**
 * Triggers silent printing in Electron (via electronAPI.printSilent) or falls
 * back to browser window.print() when not running in Electron.
 * Always resolves with `{ success, error }` so callers can show a print error popup.
 */
export async function triggerSilentPrint(): Promise<PrintResult> {
  const api = (window as any).electronAPI;
  if (api && typeof api.printSilent === 'function') {
    try {
      const maybePromise = api.printSilent();
      if (maybePromise && typeof maybePromise.then === 'function') {
        const res = await maybePromise;
        if (res && typeof res === 'object' && 'success' in res) {
          if (!res.success) {
            return {
              success: false,
              error:
                res.error ||
                'Failed to print the rental bill. Please check your printer connection.'
            };
          }
          return { success: true };
        }
      }
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error:
          err?.message ||
          'Failed to print the rental bill. Please check your printer connection.'
      };
    }
  }

  try {
    if (typeof window.print !== 'function') {
      return {
        success: false,
        error: 'Printing is not available in this environment.'
      };
    }
    window.print();
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to print the rental bill.'
    };
  }
}

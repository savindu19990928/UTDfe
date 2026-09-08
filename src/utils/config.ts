// Environment configuration
// To use a real env variable, replace the fallback with:
//   import.meta.env.VITE_API_URL (Vite) or process.env.REACT_APP_API_URL (CRA)

export const API_URL =
    typeof import.meta !== 'undefined' &&
    (import.meta as any).env?.VITE_API_URL ||
    'https://tdpos-762230283653.asia-southeast1.run.app//api/';
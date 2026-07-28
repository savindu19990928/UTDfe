import React from 'react';
import './index.css';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { API_URL } from './utils/config';

const apiOrigin = new URL(API_URL, window.location.origin).origin;
for (const rel of ['preconnect', 'dns-prefetch']) {
  const link = document.createElement('link');
  link.rel = rel;
  link.href = apiOrigin;
  if (rel === 'preconnect') link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
}

const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(<App />);
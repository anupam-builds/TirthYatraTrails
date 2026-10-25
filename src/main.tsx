import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global capture-phase keyboard event sanitizer for browser autofill & extension scripts (e.g. dymvgb96d.js)
if (typeof window !== 'undefined') {
  const sanitizeKeyEvent = (e: KeyboardEvent) => {
    if (!e) return;
    if (typeof e.key === 'undefined' || e.key === null) {
      try {
        Object.defineProperty(e, 'key', { value: '', configurable: true, writable: true });
      } catch {
        try {
          e.stopImmediatePropagation();
        } catch {
          // ignore
        }
      }
    }
    if (typeof e.code === 'undefined' || e.code === null) {
      try {
        Object.defineProperty(e, 'code', { value: '', configurable: true, writable: true });
      } catch {
        // ignore
      }
    }
  };

  window.addEventListener('keydown', sanitizeKeyEvent, true);
  window.addEventListener('keyup', sanitizeKeyEvent, true);
  window.addEventListener('keypress', sanitizeKeyEvent, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

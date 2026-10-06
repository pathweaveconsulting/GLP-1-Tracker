import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
Element.prototype.scrollIntoView = vi.fn();

// jsdom has no layout, so recharts' ResponsiveContainer always reports 0x0.
// Silence only that specific warning; every other console.warn still surfaces.
const originalWarn = console.warn.bind(console);
const originalError = console.error.bind(console);
const isRechartsSizeWarning = (args: unknown[]) =>
  typeof args[0] === 'string' && /width\(0\) and height\(0\)/.test(args[0]);
console.warn = (...args: unknown[]) => {
  if (isRechartsSizeWarning(args)) return;
  originalWarn(...args);
};
console.error = (...args: unknown[]) => {
  if (isRechartsSizeWarning(args)) return;
  originalError(...args);
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

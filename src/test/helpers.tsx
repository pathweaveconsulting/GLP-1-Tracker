import { render, screen, waitFor } from '@testing-library/react';
import { expect } from 'vitest';
import App from '../App';

export const ROUTES = [
  '/', '/this-week', '/doses', '/weight', '/effects', '/results', '/results?tab=journey',
  '/results?tab=progress', '/recommendations', '/health', '/calendar', '/logs', '/reports', '/settings',
];

/** Render the real <App/> at `path` and wait for lazy routes to finish loading. */
export async function open(path: string) {
  window.history.pushState({}, '', path);
  const utils = render(<App />);
  await waitFor(
    () => {
      expect(screen.queryByText(/Loading…/)).not.toBeInTheDocument();
      expect(document.querySelector('main')).toBeInTheDocument();
    },
    { timeout: 10_000 },
  );
  return utils;
}


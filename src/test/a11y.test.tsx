import { describe, it, expect } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { computeAccessibleName } from 'dom-accessibility-api';
import { seedStore } from './fixtures';
import { open, ROUTES } from './helpers';

const INTERACTIVE = 'button, a[href], input:not([type="hidden"]), select, textarea';

function unnamed(root: ParentNode = document): string[] {
  const bad: string[] = [];
  root.querySelectorAll(INTERACTIVE).forEach((el) => {
    if (!computeAccessibleName(el).trim()) bad.push(el.outerHTML.slice(0, 140));
  });
  return bad;
}

describe('accessibility: every page', () => {
  for (const path of ROUTES) {
    it(`${path}: interactive controls have names and there is exactly one <h1>`, async () => {
      seedStore('populated', 'lbs');
      await open(path);
      expect(unnamed(), 'controls without accessible names').toEqual([]);
      expect(document.querySelectorAll('h1')).toHaveLength(1);
    });

    it(`${path}: has a skip link, one main landmark and labelled navs`, async () => {
      seedStore('populated', 'lbs');
      await open(path);
      expect(screen.getByRole('link', { name: /skip to main content/i })).toHaveAttribute('href', '#main-content');
      expect(document.querySelectorAll('main')).toHaveLength(1);
      document.querySelectorAll('nav').forEach((n) => expect(n.getAttribute('aria-label')).toBeTruthy());
    });
  }

  it('empty-data pages also keep names and a single <h1>', async () => {
    for (const path of ROUTES) {
      seedStore('empty', 'kg');
      await open(path);
      expect(unnamed(), path).toEqual([]);
      expect(document.querySelectorAll('h1'), path).toHaveLength(1);
      cleanup();
    }
  });

  it('onboarding has labelled fields and one <h1>', async () => {
    const { render } = await import('@testing-library/react');
    const { Onboarding } = await import('../pages/Onboarding');
    const { useStore } = await import('../store/useStore');
    useStore.getState().resetAllData();
    render(<Onboarding />);
    expect(unnamed()).toEqual([]);
    expect(document.querySelectorAll('h1')).toHaveLength(1);
  });
});

describe('accessibility: dialogs', () => {
  const cases: Array<{ path: string; opener: RegExp; name: RegExp; role?: 'dialog' | 'alertdialog' }> = [
    { path: '/', opener: /record injection/i, name: /log shot/i },
    { path: '/', opener: /record weight/i, name: /log weight/i },
    { path: '/', opener: /record symptoms/i, name: /log how you feel/i },
    { path: '/', opener: /^notifications/i, name: /notifications/i },
    { path: '/', opener: /about the estimated level/i, name: /about the estimated level/i },
    { path: '/', opener: /open navigation menu/i, name: /menu/i },
    { path: '/settings', opener: /edit profile/i, name: /edit profile/i },
    { path: '/settings', opener: /erase local data/i, name: /erase all data/i, role: 'alertdialog' },
    { path: '/this-week', opener: /learn more/i, name: /weekly rhythm/i },
  ];
  for (const c of cases) {
    it(`${c.name}: ${c.role ?? 'dialog'} semantics, named controls, Escape closes and focus returns`, async () => {
      seedStore('populated', 'lbs');
      const user = userEvent.setup();
      await open(c.path);
      const opener = screen.getAllByRole('button', { name: c.opener })[0];
      await user.click(opener);
      const dialog = screen.getByRole(c.role ?? 'dialog', { name: c.name });
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
      expect(unnamed(dialog)).toEqual([]);
      expect(dialog.contains(document.activeElement)).toBe(true); // focus moved inside
      await user.keyboard('{Escape}');
      expect(screen.queryByRole(c.role ?? 'dialog', { name: c.name })).not.toBeInTheDocument();
      expect(document.activeElement).toBe(opener);
    });
  }

  it('traps Tab inside an open dialog', async () => {
    seedStore('populated', 'lbs');
    const user = userEvent.setup();
    await open('/settings');
    await user.click(screen.getByRole('button', { name: /edit profile/i }));
    const dialog = screen.getByRole('dialog', { name: /edit profile/i });
    for (let i = 0; i < 25; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
    await user.tab({ shift: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('toggle groups expose their state with aria-pressed', async () => {
    seedStore('populated', 'lbs');
    const user = userEvent.setup();
    await open('/results');
    const journey = screen.getByRole('button', { name: /weight journey/i });
    expect(journey).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: /side effects overview/i }));
    expect(screen.getByRole('button', { name: /side effects overview/i })).toHaveAttribute('aria-pressed', 'true');
    expect(journey).toHaveAttribute('aria-pressed', 'false');
    expect(within(document.body).queryAllByRole('switch').every((s) => s.hasAttribute('aria-checked'))).toBe(true);
  });

  it('the trials chart uses a real switch and a labelled select', async () => {
    seedStore('populated', 'lbs');
    const user = userEvent.setup();
    await open('/results?tab=progress');
    const sw = screen.getByRole('switch', { name: /show percent change/i });
    expect(sw).toHaveAttribute('aria-checked', 'true');
    await user.click(sw);
    expect(sw).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('combobox', { name: /reference trial/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /about the trial reference curves/i }));
    expect(screen.getByRole('dialog', { name: /about the reference curves/i })).toBeInTheDocument();
  });
});

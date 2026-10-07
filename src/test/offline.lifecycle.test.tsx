import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { prepareOffline } from '../lib/offline';
import { OfflineSettings } from '../components/OfflineSettings';

const secure = Object.getOwnPropertyDescriptor(window, 'isSecureContext');
const workerProperty = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
afterEach(() => {
  vi.unstubAllEnvs();
  if (secure) Object.defineProperty(window, 'isSecureContext', secure); else Reflect.deleteProperty(window, 'isSecureContext');
  if (workerProperty) Object.defineProperty(navigator, 'serviceWorker', workerProperty); else Reflect.deleteProperty(navigator, 'serviceWorker');
});
function support(registration: object) {
  Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
  const register = vi.fn(async () => registration);
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register, getRegistration: async () => undefined } });
  return register;
}

describe('offline preparation and honest status', () => {
  it('does not register anything with the feature off; successful explicit preparation reports static files and reminder limits', async () => {
    vi.stubEnv('VITE_ENABLE_OFFLINE', 'false'); const register = support({ active: {} });
    const view = render(<OfflineSettings />); expect(screen.queryByRole('button')).toBeNull(); expect(register).not.toHaveBeenCalled();
    view.unmount(); vi.stubEnv('VITE_ENABLE_OFFLINE', 'true'); render(<OfflineSettings />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Prepare offline app files' }));
    expect(await screen.findByRole('status')).toHaveTextContent(/Offline app files are saved/);
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/', updateViaCache: 'none' });
    expect(screen.getByText(/Closing the app stops local reminder checks/)).toBeInTheDocument();
  });
  it('waits for activation, rejects a failed worker, and never claims readiness for a waiting update', async () => {
    class Worker extends EventTarget { state = 'installing'; change(value: string) { this.state = value; this.dispatchEvent(new Event('statechange')); } }
    const worker = new Worker(); support({ installing: worker });
    const result = prepareOffline(); await Promise.resolve(); worker.change('activated');
    expect(await result).toBe('ready');
    const failed = new Worker(); support({ installing: failed }); const reject = prepareOffline(); await Promise.resolve(); failed.change('redundant');
    await expect(reject).rejects.toThrow(/could not be saved/);
    support({ waiting: {}, active: {} }); expect(await prepareOffline()).toBe('waiting');
  });
  it('shows unsupported-storage failures without claiming an offline save', async () => {
    vi.stubEnv('VITE_ENABLE_OFFLINE', 'true');
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
    render(<OfflineSettings />); await userEvent.setup().click(screen.getByRole('button', { name: 'Prepare offline app files' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/supported browser over HTTPS/);
    expect(screen.queryByRole('status')).toBeNull();
  });
});

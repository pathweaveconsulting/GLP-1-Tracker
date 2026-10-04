import React from 'react';
import { CORRUPT_KEY, STORAGE_KEY } from '../store/keys';
import { downloadTextFile } from '../lib/csv';

// Deliberately independent of the store and of every other component, so it still renders when they are what broke.

function readKey(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Download whatever raw data is stored (current data, or the rescue copy of unreadable data). */
export function downloadRawData(): boolean {
  const raw = readKey(STORAGE_KEY) ?? readKey(CORRUPT_KEY);
  if (raw == null) return false;
  downloadTextFile(`glp1-tracker-raw-data-${new Date().toISOString().slice(0, 10)}.json`, raw, 'application/json');
  return true;
}

interface State {
  error: Error | null;
  confirmReset: boolean;
  noData: boolean;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null, confirmReset: false, noData: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Local-only diagnostics; nothing is sent anywhere.
    console.error('GLP-1 Companion crashed:', error, info.componentStack);
  }

  private reset = () => {
    // Keep a rescue copy before wiping the main key, then reload into a clean app.
    const raw = readKey(STORAGE_KEY);
    try {
      if (raw != null) localStorage.setItem(CORRUPT_KEY, raw);
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    const btn = 'px-4 py-2.5 rounded-[14px] text-sm font-semibold border';
    return (
      <div role="alert" style={{ maxWidth: 560, margin: '10vh auto', padding: 24, fontFamily: 'system-ui, sans-serif', color: '#111827' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Something went wrong</h1>
        <p style={{ marginTop: 8, color: '#475467', lineHeight: 1.5 }}>
          The app hit an unexpected problem. Your data is still stored on this device. You can reload, download a raw copy of it, or reset the app.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
          <button type="button" className={btn} onClick={() => window.location.reload()}>Reload</button>
          <button type="button" className={btn} onClick={() => this.setState({ noData: !downloadRawData() })}>Download raw data</button>
          <button type="button" className={btn} onClick={() => this.setState({ confirmReset: true })}>Reset app</button>
        </div>
        {this.state.noData && <p style={{ marginTop: 12, color: '#475467' }}>There is no stored data to download.</p>}
        {this.state.confirmReset && (
          <div style={{ marginTop: 16, padding: 12, border: '1px solid #FDA29B', borderRadius: 12 }}>
            <p style={{ margin: 0 }}>This erases the app’s data on this device. A rescue copy is kept until you erase data from Settings. Download the raw data first if you want it.</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="button" className={btn} onClick={this.reset}>Erase and reload</button>
              <button type="button" className={btn} onClick={() => this.setState({ confirmReset: false })}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    );
  }
}

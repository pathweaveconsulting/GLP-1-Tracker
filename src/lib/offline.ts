/** This registers only the build-generated static-asset worker. No record, secret or identifier is sent to it. */
export async function prepareOffline(): Promise<'ready' | 'waiting'> {
  if (!window.isSecureContext || !('serviceWorker' in navigator)) throw new Error('Offline installation needs a supported browser over HTTPS.');
  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
  if (registration.waiting) return 'waiting';
  const worker = registration.installing;
  if (!worker) {
    if (registration.active) return 'ready';
    throw new Error('Offline installation did not start.');
  }
  return new Promise((resolve, reject) => {
    const cleanup = () => { clearTimeout(timer); worker.removeEventListener('statechange', check); };
    const check = () => {
      if (worker.state === 'activated') { cleanup(); resolve('ready'); }
      else if (worker.state === 'installed' && registration.active) { cleanup(); resolve('waiting'); }
      else if (worker.state === 'redundant') { cleanup(); reject(new Error('Offline files could not be saved. Check available browser storage and your connection.')); }
    };
    const timer = setTimeout(() => { cleanup(); reject(new Error('Offline preparation took too long. Check your connection and try again.')); }, 60_000);
    worker.addEventListener('statechange', check);
    check();
  });
}

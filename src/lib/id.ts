/**
 * Unique id for a log row. `crypto.randomUUID` only exists in secure contexts
 * (https / localhost), so opening the app over plain http on a LAN would throw.
 */
export function newId(): string {
  const c: Crypto | undefined = typeof crypto !== 'undefined' ? crypto : undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();

  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(bytes);
  } else {
    // Last resort for very old environments; ids only need to be unique locally.
    const seed = Date.now();
    for (let i = 0; i < 16; i++) bytes[i] = (seed >>> ((i % 4) * 8)) ^ ((i * 151 + counter++) & 0xff);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

let counter = 0;

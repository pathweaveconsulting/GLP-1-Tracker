/** WebCrypto only: AES-256-GCM, fresh 96-bit IVs, 128-bit tags; PBKDF2-SHA256 at 600,000 iterations.
 * The website operator can change delivered code; this protects stored bytes, not a hostile unlocked client.
 */
import { STORAGE_KEY, CORRUPT_KEY, BACKUP_REMINDER_KEY } from '../store/keys';
export const VAULT_FORMAT = 'glp1-encrypted-vault';
export const KDF_ITERATIONS = 600_000;
export const MAX_VAULT_BYTES = 12 * 1024 * 1024;
type Cipher = { iv: string; ciphertext: string };
export type VaultSlots = Record<string, string>;
export interface VaultEnvelope {
  format: typeof VAULT_FORMAT;
  version: 1;
  id: string;
  salt: string;
  iterations: typeof KDF_ITERATIONS;
  passphrase: Cipher;
  recovery: Cipher;
  payload: Cipher;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const random = (size: number) => crypto.getRandomValues(new Uint8Array(size));
function encode(bytes: Uint8Array): string {
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
}
function decode(text: string): Uint8Array<ArrayBuffer> {
  const raw = atob(text);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
const aes = (bytes: Uint8Array<ArrayBuffer>) => crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
async function derive(secret: string, salt: string): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', encoder.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', iterations: KDF_ITERATIONS, salt: decode(salt) }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function encrypt(bytes: Uint8Array<ArrayBuffer>, key: CryptoKey, context: string): Promise<Cipher> {
  const iv = random(12);
  const result = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(context), tagLength: 128 }, key, bytes);
  return { iv: encode(iv), ciphertext: encode(new Uint8Array(result)) };
}
async function decrypt(cipher: Cipher, key: CryptoKey, context: string): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(cipher.iv), additionalData: encoder.encode(context), tagLength: 128 }, key, decode(cipher.ciphertext)));
}
const context = (id: string, purpose: string) => `${VAULT_FORMAT}/1/${id}/${purpose}`;

/** Every file we produce must fit the same limit enforced on restore. */
export function serializeVault(envelope: VaultEnvelope): string {
  const raw = JSON.stringify(envelope);
  if (raw.length > MAX_VAULT_BYTES) throw new Error('Encrypted records exceed the supported file size. Export smaller CSV files before adding more records.');
  return raw;
}

export function parseVault(raw: string): VaultEnvelope {
  if (raw.length > MAX_VAULT_BYTES) throw new Error('Encrypted file is too large.');
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') throw new Error('Invalid encrypted file.');
  const e = value as VaultEnvelope;
  if (e.format !== VAULT_FORMAT || e.version !== 1 || e.iterations !== KDF_ITERATIONS || typeof e.id !== 'string' || typeof e.salt !== 'string' || decode(e.id).length !== 16 || decode(e.salt).length !== 16) throw new Error('Unsupported encrypted file format.');
  for (const c of [e.passphrase, e.recovery, e.payload]) {
    if (!c || typeof c.iv !== 'string' || typeof c.ciphertext !== 'string' || decode(c.iv).length !== 12 || decode(c.ciphertext).length < 16) throw new Error('Invalid encrypted file.');
  }
  if (decode(e.passphrase.ciphertext).length !== 48 || decode(e.recovery.ciphertext).length !== 48) throw new Error('Invalid wrapped key.');
  return e;
}

export async function createEncryptedVault(passphrase: string, slots: VaultSlots) {
  if (passphrase.length < 14 || passphrase.length > 1024) throw new Error('Use a unique passphrase of 14–1024 characters, preferably several words.');
  const bytes = random(32);
  const key = await aes(bytes);
  const recoveryKey = encode(random(32));
  const id = encode(random(16));
  const salt = encode(random(16));
  const envelope: VaultEnvelope = {
    format: VAULT_FORMAT, version: 1, id, salt, iterations: KDF_ITERATIONS,
    passphrase: await encrypt(bytes, await derive(passphrase, salt), context(id, 'passphrase')),
    recovery: await encrypt(bytes, await derive(recoveryKey, salt), context(id, 'recovery')),
    payload: await encrypt(encoder.encode(JSON.stringify(slots)), key, context(id, 'records')),
  };
  bytes.fill(0);
  serializeVault(envelope);
  return { envelope, key, recoveryKey };
}

export async function decryptSlots(envelope: VaultEnvelope, key: CryptoKey): Promise<VaultSlots> {
  const slots: unknown = JSON.parse(decoder.decode(await decrypt(envelope.payload, key, context(envelope.id, 'records'))));
  if (!slots || typeof slots !== 'object' || Array.isArray(slots) || Object.entries(slots).some(([k,v]) => ![STORAGE_KEY, CORRUPT_KEY, BACKUP_REMINDER_KEY].includes(k) || typeof v !== 'string')) throw new Error('Invalid vault records.');
  return slots as VaultSlots;
}

export async function openEncryptedVault(raw: string, secret: string, recovery = false) {
  if (secret.length > 1024) throw new Error('Unlock value is too long.');
  const envelope = parseVault(raw);
  const bytes = await decrypt(recovery ? envelope.recovery : envelope.passphrase, await derive(secret, envelope.salt), context(envelope.id, recovery ? 'recovery' : 'passphrase'));
  const key = await aes(bytes);
  bytes.fill(0);
  return { envelope, key, slots: await decryptSlots(envelope, key) };
}

export async function encryptSlots(envelope: VaultEnvelope, key: CryptoKey, slots: VaultSlots): Promise<VaultEnvelope> {
  return { ...envelope, payload: await encrypt(encoder.encode(JSON.stringify(slots)), key, context(envelope.id, 'records')) };
}

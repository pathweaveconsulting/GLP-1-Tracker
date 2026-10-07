import { webcrypto } from 'node:crypto';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createEncryptedVault, openEncryptedVault, encryptSlots, parseVault } from './vaultCrypto';

const phrase = 'violet orchard river mountain';
const slots = { 'glp1-tracker-storage': '{"private":"patient records"}', 'glp1-tracker-storage-corrupt': 'original damaged bytes' };
beforeEach(() => vi.stubGlobal('crypto', webcrypto));
afterEach(() => vi.unstubAllGlobals());

describe('authenticated vault cryptography', () => {
  it('round-trips Unicode records and rescue bytes using either secret, without persisting secrets or plaintext', async () => {
    const original = { ...slots, 'glp1-tracker-storage': '{"notes":"नमस्ते 🌿"}' };
    const made = await createEncryptedVault(phrase, original);
    const raw = JSON.stringify(made.envelope);
    expect(raw).not.toContain(phrase);
    expect(raw).not.toContain(made.recoveryKey);
    expect(raw).not.toContain('original damaged bytes');
    expect(raw).not.toContain('नमस्ते');
    expect((await openEncryptedVault(raw, phrase)).slots).toEqual(original);
    expect((await openEncryptedVault(raw, made.recoveryKey, true)).slots).toEqual(original);
    expect(made.key.extractable).toBe(false);
  });

  it('rejects a wrong passphrase, altered ciphertext, swapped purpose and unsupported work factors', async () => {
    const made = await createEncryptedVault(phrase, slots);
    const raw = JSON.stringify(made.envelope);
    await expect(openEncryptedVault(raw, 'wrong password')).rejects.toThrow();
    const changed = structuredClone(made.envelope);
    const cipher = Buffer.from(changed.payload.ciphertext, 'base64');
    cipher[0] ^= 1;
    changed.payload.ciphertext = cipher.toString('base64');
    await expect(openEncryptedVault(JSON.stringify(changed), phrase)).rejects.toThrow();
    await expect(openEncryptedVault(JSON.stringify({ ...made.envelope, passphrase: made.envelope.recovery }), made.recoveryKey)).rejects.toThrow();
    expect(() => parseVault(JSON.stringify({ ...made.envelope, iterations: 1 }))).toThrow();
    expect(() => parseVault(JSON.stringify({ ...made.envelope, version: 2 }))).toThrow();
  });

  it('uses different payload IVs even when saving identical records repeatedly', async () => {
    const made = await createEncryptedVault(phrase, slots);
    const a = await encryptSlots(made.envelope, made.key, slots);
    const b = await encryptSlots(made.envelope, made.key, slots);
    expect(new Set([made.envelope.payload.iv, a.payload.iv, b.payload.iv]).size).toBe(3);
    expect((await openEncryptedVault(JSON.stringify(b), phrase)).slots).toEqual(slots);
  });
});

# Security and recovery

This release adds a local encrypted vault. There is no account, backend, telemetry, remote key escrow or cloud sync. Records remain in the visitor's browser, separately for each origin.

## Stored records

Native WebCrypto encrypts all persisted profile/log data, unreadable rescue copies and backup-reminder metadata using a random AES-256-GCM data key. Each payload and wrapped key has a fresh random 96-bit IV and a 128-bit authentication tag. Format, vault ID and purpose are authenticated as additional data. The data key is wrapped separately using a passphrase-derived key and a random recovery secret; PBKDF2-SHA256 uses a random 128-bit salt and 600,000 iterations. Imported session keys are nonextractable. The minimum passphrase length is 14 characters; users should choose a unique, strong passphrase, preferably several unrelated words.

Only ciphertext and format metadata are saved under `glp1-encrypted-vault`. Plaintext and keys exist in JavaScript memory while unlocked. The app removes its references on locking; it cannot guarantee immediate zeroing of browser memory. Reloads require unlocking. Ten minutes without a pointer or keyboard event triggers locking. Locking hides private content while pending writes finish. If storage refuses a save, locking retains an encrypted snapshot in this tab and offers a download; closing the tab loses that unsaved snapshot.

WebCrypto and Web Locks are required in a secure context. Saves are serialized and compare the previous ciphertext under a browser lock. If another tab changes the vault, this tab refuses to overwrite it; download unsaved data before reloading. This is conflict protection, not simultaneous multi-tab editing support.

Daily protein/water logs use a separate slot within the same encrypted payload and serialized write queue, with no separate plaintext fallback. Existing daily history remains readable/exportable when its preview entry flag is disabled. The new slot is rejected by older app builds rather than silently discarded. JSON backup version 2 validates daily rows strictly; old version 1 backups contain no daily rows and replace current daily history only after the explicit replacement confirmation. Failed daily writes are kept optimistically in this tab and included in encrypted unsaved recovery; no successful-save message is shown on failure. Corrupt daily bytes block new daily writes and remain in encrypted exports.

## Migration, backup and loss

Migration captures the legacy records and rescue/reminder metadata. It verifies the encrypted stored copy and decrypts it for comparison before removing any plaintext copy. Failed writes keep the originals. If removal fails, the app stays gated and retries on unlocking; plaintext may still exist until cleanup succeeds. Browser storage quotas apply; encrypted files are limited to 12 MiB.

Save the recovery key outside this browser, privately. The passphrase or recovery key can unlock an encrypted backup; anyone possessing either secret and the file can read it. There is no administrator reset, secret escrow or recovery-key redisplay. Recovery-key unlocking is supported; changing the passphrase is not implemented in this release.

Encrypted backup restoration decrypts and validates the healthy records before showing the existing replacement confirmation. Restoration imports profile and logs into the destination vault; it does not import rescue bytes or reminder timestamps. Backup download initiation does not prove that a file was saved. Users explicitly confirm saving. Clearing browser data, deleting the browser profile or losing both secrets can permanently lose records. Keep more than one private backup.

CSV and doctor/print exports are plaintext. Store or share those deliberately. The crash boundary offers the last saved encrypted bytes, which may exclude recent unsaved changes; it does not erase the vault.

## Threat model and external protection

Encryption protects stored bytes against someone who obtains browser storage or a backup without the secrets. It does **not** protect an unlocked browser, malware, extensions, a weak passphrase against offline guessing, screen capture, or malicious replacement of the delivered application. A website operator who can deploy new JavaScript could steal a secret on the next unlock. Thus this browser-delivered application cannot honestly promise protection against a malicious administrator controlling the code. Independent release review and protection of hosting/GitHub accounts remain necessary.

Cloudflare Pages serves static assets. CSP restricts scripts to this origin, restricts network connections to the app origin and disallows objects, form submission and framing, and allows local/data fonts and local/data/blob images. Inline CSS is allowed for the current UI. No secret is placed in a Vite environment variable. The optional worker caches only build-derived public files. It never receives vault records or secrets. Registration is opt-in behind VITE_ENABLE_OFFLINE, and no forced update or reload is used. The self-only connection allowance permits static precaching; it does not authorize any data upload. Future background notifications or sync require separate policy and threat-model review.

Cloudflare's zone ruleset inventory was read on 2026-10-07: it listed normalization, the Managed Free Ruleset and the DDoS L7 ruleset. Listing a managed ruleset does not prove an executing rule or specific attack protection. The API returned "could not find entrypoint ruleset" for the managed WAF, DDoS and custom firewall phases. Automatic platform protections may still apply; these responses do not prove their effective coverage. A later Request Trace (with origin requests skipped) confirmed that the Free Managed Ruleset is evaluated for a clean GET. A hostname-scoped custom guard was added on 2026-10-07: ruleset `731d190551df423d8ef2384e8fc875aa`, rule `f06b5b7263e546d381d9643f40137a30`. It blocks methods other than GET/HEAD/OPTIONS and private-file probes beginning with `/.git` or `/.env`, only for `glp1.pathweave.co.in`. It does not apply to other hosts or replace managed protections. Before introducing any backend or upload endpoint, explicitly review this method restriction. Trace simulation is not a penetration test or proof against every attack. Account MFA, collaborator access and deployment credentials require owner review.

Before production: run type-checking, normal and New York tests, build, dependency audit, then real-browser migration/unlock/lock/export/restore and effective-header checks on preview. Clinical wording, accessibility on actual assistive technology and mobile devices remain separate release checks. No penetration test or independent cryptographic audit has been performed.

References for review:
- https://www.w3.org/TR/WebCryptoAPI/
- https://developer.mozilla.org/en-US/docs/Web/API/AesGcmParams
- https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

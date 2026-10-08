import { useState } from 'react';

export const EDIT_UNDO_REFUSED = 'Could not undo: this record changed again or was removed after your edit. It was kept as it is.';

/**
 * Remembers the latest edit made on this page so it can be undone while the page stays open. Undo goes through the
 * same stale-safe edit action, so it only succeeds if the record still looks exactly as the edit left it.
 */
export function useEditUndo<T extends { id: string }>(read: () => T[], edit: (expected: T, next: Omit<T, 'id'>) => boolean) {
  const [last, setLast] = useState<{ before: T; after: T }>();
  const record = (before: T) => {
    const after = read().find((r) => r.id === before.id);
    if (after) setLast({ before, after });
  };
  const undo = (): boolean => {
    if (!last) return false;
    const { id: _id, ...fields } = last.before;
    const ok = edit(last.after, fields as Omit<T, 'id'>);
    if (ok) setLast(undefined);
    return ok;
  };
  return { last, record, undo, clear: () => setLast(undefined) };
}

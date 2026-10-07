export const STORAGE_KEY = 'glp1-tracker-storage';
export const VAULT_KEY = 'glp1-encrypted-vault';
export const DAILY_LOGS_KEY = 'glp1-daily-logs';
/** Latest raw copy of stored data that could not be read or had rows dropped. Only the newest copy is kept. */
export const CORRUPT_KEY = 'glp1-tracker-storage-corrupt';
/** Reminder timestamps only; never health records or encryption keys. */
export const BACKUP_REMINDER_KEY = 'glp1-backup-reminder';

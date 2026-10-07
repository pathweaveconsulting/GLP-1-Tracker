/** New enhancements stay off in production until separately reviewed and enabled. Never put secrets in VITE_* flags. */
export const offlineEnabled = () => import.meta.env.VITE_ENABLE_OFFLINE === 'true';
export const dailyLogsEnabled = () => import.meta.env.VITE_ENABLE_DAILY_LOGS === 'true';

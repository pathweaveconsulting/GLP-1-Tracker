/** New enhancements stay off in production until separately reviewed and enabled. Never put secrets in VITE_* flags. */
export const offlineEnabled = () => import.meta.env.VITE_ENABLE_OFFLINE === 'true';
export const dailyLogsEnabled = () => import.meta.env.VITE_ENABLE_DAILY_LOGS === 'true';
export const doctorReportEnabled = () => import.meta.env.VITE_ENABLE_DOCTOR_REPORT === 'true';
/** Offers the confirmed, recoverable upgrade of saved records to the schema-2 format. Reading upgraded data is always on. */
export const liveSchemaUpgradeEnabled = () => import.meta.env.VITE_ENABLE_LIVE_SCHEMA_V2 === 'true';

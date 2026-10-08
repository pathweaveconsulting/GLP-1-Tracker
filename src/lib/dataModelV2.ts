import type { BackupData } from './backup';
import type { UserSettings, DoseEvent, WeightEntry, EffectEntry } from '../types';
import { validateDailyRows, type DailyLog } from './dailyLogs';
import { checkDose, checkWeight, checkEffect, isIso, isObj, type RowResult } from './rowValidation';
import { normalizeMedication } from './medications';

export const DATA_MODEL_FORMAT = 'glp1-companion-data';
export const DATA_MODEL_VERSION = 2;
export interface Provenance {
  id: string;
  createdAt: string | null;
  updatedAt: string | null;
  source: 'manual' | 'csv_import' | 'backup_restore' | 'integration' | 'legacy';
  importBatchId: string | null;
  externalIntegrationSource: string | null;
}
export interface DataModelV2 {
  format: typeof DATA_MODEL_FORMAT;
  schemaVersion: 2;
  profile: UserSettings;
  doses: DoseEvent[];
  weights: WeightEntry[];
  legacyEffects: EffectEntry[];
  /** Existing protein/water day totals. These are not new symptom/mood scales. */
  checkIns: DailyLog[];
  medicationSchedules: never[];
  supplies: never[];
  reminders: never[];
  milestones: never[];
  preferences: Record<string, never>;
  notes: never[];
  metadata: {
    migratedFrom: 1;
    dailyLogsPresent: boolean;
    provenance: { doses: Provenance[]; weights: Provenance[]; legacyEffects: Provenance[]; checkIns: Provenance[] };
  };
}

const sameJson = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => sameJson(v, b[i]));
  if (!isObj(a) || !isObj(b)) return false;
  const keys = (v: Record<string, unknown>) => Object.keys(v).filter(k => v[k] !== undefined).sort();
  const ak = keys(a), bk = keys(b);
  return ak.length === bk.length && ak.every((k, i) => k === bk[i] && sameJson(a[k], b[k]));
};
function exactKeys(value: Record<string, unknown>, allowed: readonly string[], label: string): void {
  if (Object.keys(value).some(k => !allowed.includes(k))) throw Error(`${label} contains unsupported fields. Nothing was migrated.`);
}
function profile(value: unknown): UserSettings {
  if (!isObj(value)) throw Error('Missing profile. Nothing was migrated.');
  exactKeys(value, ['medication','startingWeight','targetWeight','heightInches','startDate','weightUnit','customSites','customEffectNames'], 'Profile');
  if (normalizeMedication(value.medication) !== value.medication || !isIso(value.startDate)) throw Error('Invalid profile medication or date.');
  for (const key of ['startingWeight','targetWeight','heightInches']) if (typeof value[key] !== 'number' || !Number.isFinite(value[key]) || (value[key] as number) < 0) throw Error(`Invalid profile ${key}.`);
  if (value.weightUnit !== undefined && value.weightUnit !== 'kg' && value.weightUnit !== 'lbs') throw Error('Invalid display unit.');
  for (const key of ['customSites','customEffectNames']) if (value[key] !== undefined && (!Array.isArray(value[key]) || !(value[key] as unknown[]).every(v => typeof v === 'string'))) throw Error(`Invalid ${key}.`);
  return structuredClone(value) as unknown as UserSettings;
}
function rows<T extends {id: string}>(value: unknown, check: (row: unknown) => RowResult<T>, label: string): T[] {
  if (!Array.isArray(value)) throw Error(`${label} must be a list.`);
  const ids = new Set<string>();
  return value.map(row => {
    const result = check(row);
    if (!result.ok || !sameJson(row, result.row)) throw Error(`${label} contains an invalid or unsupported row. Nothing was migrated.`);
    if (ids.has(result.row.id)) throw Error(`${label} contains duplicate IDs. Nothing was migrated.`);
    ids.add(result.row.id);
    return structuredClone(result.row);
  });
}
/** Strict conversion: never drop unknown fields or reinterpret legacy ratings. No storage or clock access. */
export function migrateDataModelV2(input: BackupData): DataModelV2 {
  if (!isObj(input)) throw Error('Missing data.');
  exactKeys(input, ['settings','doses','weights','effects','dailyLogs'], 'Legacy data');
  const doses = rows(input.doses, checkDose, 'Doses');
  const weights = rows(input.weights, checkWeight, 'Weights');
  const legacyEffects = rows(input.effects, checkEffect, 'Legacy symptoms');
  const checkIns = input.dailyLogs === undefined ? [] : validateDailyRows(input.dailyLogs);
  const provenance = (ids: string[]): Provenance[] => ids.map(id => ({id,createdAt:null,updatedAt:null,source:'legacy',importBatchId:null,externalIntegrationSource:null}));
  return {
    format:DATA_MODEL_FORMAT, schemaVersion:2, profile:profile(input.settings), doses, weights, legacyEffects, checkIns,
    medicationSchedules:[], supplies:[], reminders:[], milestones:[], preferences:{}, notes:[],
    metadata:{migratedFrom:1,dailyLogsPresent:input.dailyLogs !== undefined,provenance:{doses:provenance(doses.map(r=>r.id)),weights:provenance(weights.map(r=>r.id)),legacyEffects:provenance(legacyEffects.map(r=>r.id)),checkIns:provenance(checkIns.map(r=>`daily:${r.date}`))}},
  };
}
const PROVENANCE_KEYS = ['id','createdAt','updatedAt','source','importBatchId','externalIntegrationSource'] as const;
const LIVE_SOURCES: readonly Provenance['source'][] = ['manual','csv_import','backup_restore','legacy'];
/**
 * One provenance entry per record, in record order. Sources the app can actually produce are accepted; integrations
 * are not implemented, so an integration source or external identifier is rejected rather than trusted.
 */
function checkProvenance(value: unknown, ids: string[], label: string): Provenance[] {
  if (!Array.isArray(value) || value.length !== ids.length) throw Error(`${label} provenance does not match its records. Nothing was migrated.`);
  return value.map((entry, i) => {
    if (!isObj(entry)) throw Error(`${label} provenance is invalid.`);
    exactKeys(entry, PROVENANCE_KEYS, `${label} provenance`);
    const ok = entry.id === ids[i]
      && LIVE_SOURCES.includes(entry.source as Provenance['source'])
      && (entry.createdAt === null || isIso(entry.createdAt))
      && (entry.updatedAt === null || isIso(entry.updatedAt))
      && (entry.importBatchId === null || (entry.source === 'csv_import' && typeof entry.importBatchId === 'string' && entry.importBatchId.length > 0 && entry.importBatchId.length <= 100))
      && entry.externalIntegrationSource === null
      // Legacy records have no known creation time; updatedAt records an edit made after the upgrade.
      && (entry.source !== 'legacy' || entry.createdAt === null);
    if (!ok) throw Error(`${label} provenance is invalid or unsupported. Nothing was migrated.`);
    return { ...entry } as unknown as Provenance;
  });
}
/** Validate a stored or imported model. Reserved domains must stay empty until their schemas are implemented. */
export function validateDataModelV2(value: unknown): DataModelV2 {
  if (!isObj(value) || value.format !== DATA_MODEL_FORMAT || value.schemaVersion !== 2) throw Error('Unsupported companion schema. Update the app before opening this data.');
  if (!isObj(value.metadata) || typeof value.metadata.dailyLogsPresent !== 'boolean') throw Error('Missing model metadata.');
  if (!Array.isArray(value.checkIns)) throw Error('Missing check-ins.');
  if (!value.metadata.dailyLogsPresent && value.checkIns.length) throw Error('Check-in presence metadata conflicts with records.');
  const expected = migrateDataModelV2({settings:value.profile as UserSettings,doses:value.doses as DoseEvent[],weights:value.weights as WeightEntry[],effects:value.legacyEffects as EffectEntry[],...(value.metadata.dailyLogsPresent ? {dailyLogs:value.checkIns as DailyLog[]} : {})});
  const given = value.metadata.provenance;
  if (!isObj(given)) throw Error('Missing provenance. Nothing was migrated.');
  exactKeys(given, ['doses','weights','legacyEffects','checkIns'], 'Provenance');
  const provenance = {
    doses: checkProvenance(given.doses, expected.doses.map(r => r.id), 'Dose'),
    weights: checkProvenance(given.weights, expected.weights.map(r => r.id), 'Weight'),
    legacyEffects: checkProvenance(given.legacyEffects, expected.legacyEffects.map(r => r.id), 'Symptom'),
    checkIns: checkProvenance(given.checkIns, expected.checkIns.map(r => `daily:${r.date}`), 'Check-in'),
  };
  const result: DataModelV2 = { ...expected, metadata: { ...expected.metadata, provenance } };
  // Everything except provenance must equal the strict conversion exactly: no extra fields, no nonempty reserved domains.
  if (!sameJson(value, result)) throw Error('Unsupported model fields or nonempty reserved domains. Nothing was migrated.');
  return result;
}
/** Reversible adapter for currently implemented domains; unsupported future data is rejected, never discarded. */
export function legacyDataFromV2(value: unknown): BackupData {
  const model = validateDataModelV2(value);
  return {settings:model.profile,doses:model.doses,weights:model.weights,effects:model.legacyEffects,...(model.metadata.dailyLogsPresent ? {dailyLogs:model.checkIns} : {})};
}
export type MigrationPlan = {ok:true;original:string;candidate:string;data:DataModelV2} | {ok:false;original:string;error:string};
/** Original bytes are returned on success AND failure. Caller must secure them before any future write. */
export function prepareDataModelMigration(original: string): MigrationPlan {
  try {
    const raw: unknown = JSON.parse(original);
    const data = isObj(raw) && raw.format === DATA_MODEL_FORMAT ? validateDataModelV2(raw) : migrateDataModelV2(raw as BackupData);
    const candidate = JSON.stringify(data);
    validateDataModelV2(JSON.parse(candidate));
    return {ok:true,original,candidate,data};
  } catch (error) {
    return {ok:false,original,error:error instanceof Error ? error.message : 'Migration could not be prepared.'};
  }
}

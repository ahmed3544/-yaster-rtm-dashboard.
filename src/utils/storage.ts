import { AppState } from '../types';
import { reindexRecords, DEFAULT_AGENTS } from './csvParser';

export const STORAGE_KEY = 'yaster_import_only_v4';

export const INITIAL_STATE: AppState = {
  cdr: [],
  login: [],
  pause: [],
  schedules: {},
  breaks: {},
  meta: {},
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw);

    const rawCdr = Array.isArray(parsed.cdr) ? parsed.cdr : [];
    const rawLogin = Array.isArray(parsed.login) ? parsed.login : [];
    const rawPause = Array.isArray(parsed.pause) ? parsed.pause : [];

    // Automatically re-index records so any previously imported rows with missing _agent or _date match properly
    const reindexedCdr = reindexRecords(rawCdr, DEFAULT_AGENTS);
    const reindexedLogin = reindexRecords(rawLogin, DEFAULT_AGENTS);
    const reindexedPause = reindexRecords(rawPause, DEFAULT_AGENTS);

    return {
      cdr: reindexedCdr,
      login: reindexedLogin,
      pause: reindexedPause,
      schedules: parsed.schedules && typeof parsed.schedules === 'object' ? parsed.schedules : {},
      breaks: parsed.breaks && typeof parsed.breaks === 'object' ? parsed.breaks : {},
      meta: parsed.meta && typeof parsed.meta === 'object' ? parsed.meta : {},
    };
  } catch (e) {
    console.error('Failed to load state from localStorage:', e);
    return INITIAL_STATE;
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state to localStorage:', e);
  }
}

export function downloadJsonFile(filename: string, data: unknown): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsvFile(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

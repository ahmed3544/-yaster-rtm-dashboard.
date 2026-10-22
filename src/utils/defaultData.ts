import { AppState, Agent } from '../types';
import { parseCSV, extractRecords, prepRecords, DEFAULT_AGENTS } from './csvParser';

export const SYSTEM_SHEETS = {
  cdr: '/assets/aistudio/PSE-Cdr-83.24.0.73-download-20261022123018-N4AeDsPtX3ECLKxb__1__b145a00f.csv',
  login: '/assets/aistudio/PSE-Agent_Login_Activity-83.24.0.73-Download-20261022123104-OxWgKB17noVWchbS__1__4c65c016.csv',
  pause: '/assets/aistudio/PSE-Agent_Pause_Activity-83.24.0.73-Download-20261022123118-Oh3nGc48Mv7Kbfui_96258ea1.csv',
};

export async function loadSystemYeastarData(
  agents: Agent[] = DEFAULT_AGENTS
): Promise<Partial<AppState>> {
  const [cdrRes, loginRes, pauseRes] = await Promise.all([
    fetch(SYSTEM_SHEETS.cdr),
    fetch(SYSTEM_SHEETS.login),
    fetch(SYSTEM_SHEETS.pause),
  ]);

  if (!cdrRes.ok || !loginRes.ok || !pauseRes.ok) {
    throw new Error('Could not load one or more system CSV attachments from server');
  }

  const [cdrText, loginText, pauseText] = await Promise.all([
    cdrRes.text(),
    loginRes.text(),
    pauseRes.text(),
  ]);

  const cdrRows = parseCSV(cdrText);
  const loginRows = parseCSV(loginText);
  const pauseRows = parseCSV(pauseText);

  const cdrRecords = extractRecords(cdrRows, ['call from']);
  const loginRecords = extractRecords(loginRows, ['logged in']);
  const pauseRecords = extractRecords(pauseRows, ['pause', 'total pause time']);

  const preppedCdr = prepRecords(cdrRecords, agents);
  const preppedLogin = prepRecords(loginRecords, agents);
  const preppedPause = prepRecords(pauseRecords, agents);

  const now = new Date().toLocaleString();

  return {
    cdr: preppedCdr,
    login: preppedLogin,
    pause: preppedPause,
    meta: {
      cdr: `PSE-Cdr (System) · ${now}`,
      login: `PSE-Agent_Login_Activity (System) · ${now}`,
      pause: `PSE-Agent_Pause_Activity (System) · ${now}`,
    },
  };
}

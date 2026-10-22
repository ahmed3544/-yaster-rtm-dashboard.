import { AppState, DateRange, AgentMetrics, ScheduleItem, BreakPlan } from '../types';
import {
  getField,
  parseDuration,
  parseDurationInSeconds,
  parseMs,
  dateOf,
  matchAgent,
  DEFAULT_AGENTS,
} from './csvParser';

export function formatDuration(minutes: number | null | undefined): string {
  const n = Number(minutes) || 0;
  const hours = Math.floor(n / 60);
  const mins = Math.round(n % 60);
  return `${hours}h ${String(mins).padStart(2, '0')}m`;
}

export function formatClock(msTime: number | null | undefined): string {
  if (msTime == null) return '—';
  const totalMins = Math.round(msTime / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function isInRange(dateStr: string | undefined, range: DateRange | null): boolean {
  if (!range) return true; // null range means "All dates / All time"
  if (!dateStr) return false;
  return dateStr >= range.s && dateStr <= range.e;
}

export function getCallStatus(o: Record<string, unknown>): string {
  return getField(o, [
    'last status',
    'call status',
    'status',
    'disposition',
    'call disposition',
    'call result',
    'state',
    'result',
  ]);
}

export function getTalkDurationSeconds(o: Record<string, unknown>): number {
  const raw = getField(o, [
    'talk duration',
    'talking duration',
    'handling duration',
    'call duration',
    'duration',
    'total duration',
    'billable duration',
  ]);
  return parseDurationInSeconds(raw);
}

export function isCallAnswered(o: Record<string, unknown>): boolean {
  const status = getCallStatus(o);
  if (/answer|connect|success/i.test(status)) return true;
  // If status is not explicitly set, check if talk duration was recorded
  const talkSec = getTalkDurationSeconds(o);
  if (talkSec > 0) return true;
  return false;
}

export function isCallAbandoned(o: Record<string, unknown>): boolean {
  if (isCallAnswered(o)) return false;
  const status = getCallStatus(o);
  if (/abandon|no ?answer|miss|busy|fail|cancel/i.test(status)) return true;
  return true;
}

export function filterRecords<T extends Record<string, unknown>>(
  records: T[],
  range: DateRange | null,
  agentName: string
): T[] {
  return records.filter(o => {
    const d = (o._date as string) || dateOf(o);
    const inDate = isInRange(d, range);
    if (!inDate) return false;
    if (!agentName || agentName === 'all') return true;
    const a = (o._agent as string) || matchAgent(o, DEFAULT_AGENTS);
    return a === agentName;
  });
}

export function calculateMetrics(
  agentName: string,
  range: DateRange | null,
  state: AppState
): AgentMetrics {
  const c = filterRecords(state.cdr, range, agentName);
  const answered = c.filter(isCallAnswered);
  const aband = c.filter(isCallAbandoned);

  // Total talk duration in seconds
  const totalTalkSeconds = answered.reduce((s, o) => s + getTalkDurationSeconds(o), 0);

  const l = filterRecords(state.login, range, agentName);
  const p = filterRecords(state.pause, range, agentName);

  // Login & pause durations in minutes
  const loginMinutes = l.reduce(
    (s, o) =>
      s + parseDuration(getField(o, ['total login time', 'login duration', 'total duration', 'duration', 'online duration'])),
    0
  );
  const pauseMinutes = p.reduce(
    (s, o) =>
      s + parseDuration(getField(o, ['total pause time', 'pause duration', 'duration', 'total duration'])),
    0
  );

  // AHT in seconds
  const ahtSeconds = answered.length > 0 ? totalTalkSeconds / answered.length : 0;
  const util = loginMinutes > 0 ? Math.max(0, ((loginMinutes - pauseMinutes) / loginMinutes) * 100) : 0;
  const occup = loginMinutes > 0 ? ((totalTalkSeconds / 60) / loginMinutes) * 100 : 0;

  return {
    name: agentName,
    calls: c.length,
    ans: answered.length,
    aband: aband.length,
    talk: totalTalkSeconds, // in seconds
    login: loginMinutes,   // in minutes
    pause: pauseMinutes,   // in minutes
    aht: ahtSeconds,       // in seconds
    util,
    occup,
  };
}

export function getSchedule(
  state: AppState,
  agent: string,
  date: string
): ScheduleItem | undefined {
  return state.schedules[`${date}|${agent}`] || state.schedules[`${agent}|${date}`];
}

export function getBreakPlan(
  state: AppState,
  agent: string,
  date: string
): BreakPlan | undefined {
  return state.breaks[`${agent}|${date}`] || state.breaks[`${date}|${agent}`];
}

export interface AttendanceResult {
  schedule?: ScheduleItem;
  status: string;
  firstLogin: string;
  late: string;
}

export function getAttendanceResult(
  agentName: string,
  date: string,
  state: AppState
): AttendanceResult {
  const s = getSchedule(state, agentName, date);
  if (!s) {
    return { schedule: undefined, status: 'Not configured', firstLogin: '—', late: '—' };
  }
  if (s.status !== 'Work') {
    return { schedule: s, status: s.status, firstLogin: '—', late: '—' };
  }

  const agentLogins = state.login.filter(
    o => ((o._agent as string) || matchAgent(o, DEFAULT_AGENTS)) === agentName && dateOf(o) === date
  );

  const timestamps = agentLogins
    .map(o => parseMs(getField(o, ['logged in', 'login time', 'start time', 'time', 'login'])))
    .filter((x): x is number => x !== null);

  const actual = timestamps.length ? Math.min(...timestamps) : null;
  if (actual === null) {
    return { schedule: s, status: 'Absent', firstLogin: 'No login', late: '—' };
  }

  const scheduledStartMs = parseMs(s.start) ?? 0;
  const lateMinutes = Math.max(0, Math.round((actual - scheduledStartMs) / 60000));
  const isLate = lateMinutes > (+s.grace || 0);

  return {
    schedule: s,
    status: isLate ? 'Late' : 'On Time',
    firstLogin: formatClock(actual),
    late: `${lateMinutes} min`,
  };
}

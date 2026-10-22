import { Agent, CSVRecord } from '../types';

export const DEFAULT_AGENTS: Agent[] = [
  { id: '5005', name: 'Norhan Hassan' },
  { id: '5006', name: 'Yara Mohamed' },
  { id: '5007', name: 'Nada Mohamed' },
  { id: '5009', name: 'Nancy Ashraf' },
  { id: '5011', name: 'Salma Abdel Latif' },
];

export function norm(s: unknown): string {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Robust CSV parser that handles quotes, escaped quotes, newlines inside cells,
 * UTF-8 BOM, and supports comma, semicolon, or tab delimiters.
 */
export function parseCSV(text: string): string[][] {
  const t = text.replace(/^\uFEFF/, '');
  if (!t.trim()) return [];

  // Auto-detect delimiter from the first line (comma, semicolon, or tab)
  let delimiter = ',';
  const firstLine = t.split(/[\r\n]+/)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  if (semiCount > commaCount && semiCount > tabCount) {
    delimiter = ';';
  } else if (tabCount > commaCount && tabCount > semiCount) {
    delimiter = '\t';
  }

  const rows: string[][] = [];
  let r: string[] = [];
  let v = '';
  let q = false;

  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === '"' && q && t[i + 1] === '"') {
      v += '"';
      i++;
    } else if (c === '"') {
      q = !q;
    } else if (c === delimiter && !q) {
      r.push(v.trim());
      v = '';
    } else if ((c === '\n' || c === '\r') && !q) {
      if (c === '\r' && t[i + 1] === '\n') {
        i++;
      }
      r.push(v.trim());
      if (r.some(x => x)) {
        rows.push(r);
      }
      r = [];
      v = '';
    } else {
      v += c;
    }
  }
  r.push(v.trim());
  if (r.some(x => x)) {
    rows.push(r);
  }
  return rows;
}

export function findHeaderRow(rows: string[][], need: string[]): number {
  for (let i = 0; i < Math.min(rows.length, 80); i++) {
    const h = rows[i].map(norm);
    if (need.every(n => h.some(x => x.includes(norm(n))))) {
      return i;
    }
  }
  return 0;
}

export function extractRecords(rows: string[][], need: string[]): Record<string, string>[] {
  const i = findHeaderRow(rows, need);
  const h = rows[i].map(x => String(x || '').trim());
  return rows
    .slice(i + 1)
    .filter(r => r.some(Boolean))
    .map(r => Object.fromEntries(h.map((x, j) => [x, r[j] || '']).filter(x => x[0])))
    .filter(o => !Object.values(o).some(v => /^total\b/i.test(String(v))));
}

export function getField(o: Record<string, unknown>, terms: string[]): string {
  for (const t of terms) {
    const normalizedTerm = norm(t);
    const z = Object.entries(o).find(
      ([k, v]) => norm(k).includes(normalizedTerm) && String(v || '').trim()
    );
    if (z) return String(z[1]).trim();
  }
  return '';
}

export function parseDateVal(s: unknown): string {
  const t = String(s || '').trim();
  if (!t) return '';

  // Match YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  let m = t.match(/(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})/);
  if (m) {
    return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  }

  // Match DD-MM-YYYY or MM-DD-YYYY or DD/MM/YYYY
  m = t.match(/(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})/);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    const y = m[3];
    if (a > 12) {
      return `${y}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`;
    }
    if (b > 12) {
      return `${y}-${String(a).padStart(2, '0')}-${String(b).padStart(2, '0')}`;
    }
    // Default to international DD/MM/YYYY
    return `${y}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`;
  }

  return '';
}

export function parseMs(s: unknown): number | null {
  const m = String(s || '').match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!m) return null;
  let h = +m[1];
  const p = (m[4] || '').toUpperCase();
  if (p === 'PM' && h < 12) h += 12;
  if (p === 'AM' && h === 12) h = 0;
  return (h * 60 + +m[2]) * 60000;
}

/**
 * Returns total seconds from duration string or number.
 */
export function parseDurationInSeconds(v: unknown): number {
  if (!v) return 0;
  const s = String(v).trim();
  // Match DD days HH:MM:SS or HH:MM:SS or MM:SS
  const matchHms = s.match(/(?:(\d+)\s*day\w*\s*)?(?:(\d{1,3}):)?(\d{1,2}):(\d{2})/i);
  if (matchHms) {
    const days = +(matchHms[1] || 0);
    const hours = matchHms[2] !== undefined ? +matchHms[2] : 0;
    const mins = +matchHms[3];
    const secs = +matchHms[4];
    return days * 86400 + hours * 3600 + mins * 60 + secs;
  }
  const n = Number(s);
  if (Number.isFinite(n)) {
    return n;
  }
  return 0;
}

/**
 * Returns duration in minutes (useful for login & pause metrics)
 */
export function parseDuration(v: unknown): number {
  const sec = parseDurationInSeconds(v);
  return sec / 60;
}

/**
 * High-accuracy agent matching across Yeastar CDR, Login Activity, and Pause Activity.
 * Prioritizes destination, answered by, source, agent, and extension columns,
 * and matches extension IDs with non-digit boundaries (preventing false matches on dates/years).
 */
export function matchAgent(o: Record<string, unknown>, agents: Agent[] = DEFAULT_AGENTS): string {
  // 1. Direct name match in priority agent columns
  const priorityCols = [
    'answered by', 'answered_by',
    'agent', 'agent name', 'agent ext', 'agent_name', 'agent_ext',
    'queue member', 'queue_member', 'member',
    'destination', 'dst', 'callee', 'call to', 'call_to',
    'source', 'src', 'caller', 'call from', 'call_from',
    'extension', 'ext',
    'talk with', 'talk_with',
    'disposition extension', 'transfer to'
  ];

  for (const col of priorityCols) {
    const val = getField(o, [col]);
    if (!val) continue;

    // Check full name or partial name in this field
    for (const a of agents) {
      if (a.name && norm(val).includes(norm(a.name))) {
        return a.name;
      }
    }

    // Check ID in this field with non-digit boundary
    for (const a of agents) {
      if (a.id) {
        const regex = new RegExp(`(^|[^0-9])${a.id}([^0-9]|$)`);
        if (regex.test(val)) {
          return a.name;
        }
      }
    }
  }

  // 2. Check full text of row for agent full name
  const allValues = Object.values(o).map(v => String(v || '').trim());
  const allText = allValues.join(' ');
  const normAll = norm(allText);

  for (const a of agents) {
    if (a.name && normAll.includes(norm(a.name))) {
      return a.name;
    }
  }

  // 3. Check full text of row for agent ID with non-digit boundary
  for (const a of agents) {
    if (a.id) {
      const regex = new RegExp(`(^|[^0-9])${a.id}([^0-9]|$)`);
      if (regex.test(allText)) {
        return a.name;
      }
    }
  }

  return '';
}

export function dateOf(o: Record<string, unknown>): string {
  const raw = getField(o, [
    'logged in',
    'pause',
    'time',
    'date',
    'call time',
    'calldate',
    'call date',
    'start time',
    'start_time',
    'login time',
    'pause start',
    'timestamp',
    'date time',
    'datetime'
  ]);
  return parseDateVal(raw);
}

export function prepRecords(
  rows: Record<string, string>[],
  agents: Agent[] = DEFAULT_AGENTS
): CSVRecord[] {
  return rows.map(o => ({
    ...o,
    _agent: matchAgent(o, agents),
    _date: dateOf(o),
  }));
}

/**
 * Re-indexes records to match agents and dates for previously imported datasets in localStorage.
 */
export function reindexRecords(
  records: CSVRecord[],
  agents: Agent[] = DEFAULT_AGENTS
): CSVRecord[] {
  if (!records || !records.length) return [];
  return records.map(o => {
    const currentAgent = o._agent;
    const currentDate = o._date;
    const computedAgent = currentAgent && currentAgent.trim() !== '' ? currentAgent : matchAgent(o, agents);
    const computedDate = currentDate && currentDate.trim() !== '' ? currentDate : dateOf(o);

    if (computedAgent !== currentAgent || computedDate !== currentDate) {
      return {
        ...o,
        _agent: computedAgent,
        _date: computedDate,
      };
    }
    return o;
  });
}

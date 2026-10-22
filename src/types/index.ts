export interface Agent {
  id: string;
  name: string;
}

export type CSVRecord = Record<string, string> & {
  _agent?: string;
  _date?: string;
};

export type DayStatus = 'Work' | 'OFF' | 'Leave';

export interface ScheduleItem {
  status: DayStatus;
  start: string;
  end: string;
  grace: number;
}

export interface BreakPlan {
  grace: number;
  items: [string, string, string][]; // [name, startTime, endTime]
}

export interface AppState {
  cdr: CSVRecord[];
  login: CSVRecord[];
  pause: CSVRecord[];
  schedules: Record<string, ScheduleItem>;
  breaks: Record<string, BreakPlan>;
  meta: Record<string, string>;
}

export interface DateRange {
  s: string;
  e: string;
}

export interface AgentMetrics {
  name: string;
  calls: number;
  ans: number;
  aband: number;
  talk: number;
  login: number;
  pause: number;
  aht: number;
  util: number;
  occup: number;
}

export type TabType = 'overview' | 'imports' | 'performance' | 'attendance' | 'breaks' | 'pause';

export type PeriodType = 'all' | 'day' | 'month';

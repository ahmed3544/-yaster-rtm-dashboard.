import React, { useState, useEffect } from 'react';
import { Agent, AppState, DateRange, DayStatus, PeriodType } from '../types';
import { getAttendanceResult, getSchedule, isInRange } from '../utils/metrics';

interface AttendanceTabProps {
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  agents: Agent[];
  filterRange: DateRange;
  selectedAgent: string;
  filterPeriod: PeriodType;
  filterDate: string;
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({
  state,
  onUpdateState,
  agents,
  filterRange,
  selectedAgent,
  filterPeriod,
  filterDate,
}) => {
  const [scheduleDate, setScheduleDate] = useState<string>(filterDate || new Date().toISOString().slice(0, 10));
  const [scheduleAgent, setScheduleAgent] = useState<string>(agents[0]?.name || '');
  const [status, setStatus] = useState<DayStatus>('Work');
  const [start, setStart] = useState<string>('09:00');
  const [end, setEnd] = useState<string>('18:00');
  const [grace, setGrace] = useState<number>(5);
  const [message, setMessage] = useState<string>('');

  // Load schedule when agent or date changes in form
  useEffect(() => {
    if (!scheduleAgent || !scheduleDate) return;
    const existing = getSchedule(state, scheduleAgent, scheduleDate);
    if (existing) {
      setStatus(existing.status);
      setStart(existing.start || '09:00');
      setEnd(existing.end || '18:00');
      setGrace(existing.grace ?? 5);
    } else {
      setStatus('Work');
      setStart('09:00');
      setEnd('18:00');
      setGrace(5);
    }
  }, [scheduleAgent, scheduleDate, state.schedules]);

  const handleSaveSchedule = () => {
    if (!scheduleAgent || !scheduleDate) return;
    const key = `${scheduleDate}|${scheduleAgent}`;
    onUpdateState(prev => ({
      ...prev,
      schedules: {
        ...prev.schedules,
        [key]: {
          status,
          start,
          end,
          grace: Number(grace) || 0,
        },
      },
    }));
    setMessage('Schedule saved.');
    setTimeout(() => setMessage(''), 3000);
  };

  // Build attendance results rows
  const activeAgents = agents.filter(
    a => !selectedAgent || selectedAgent === 'all' || selectedAgent === a.name
  );

  const scheduleKeys = Object.keys(state.schedules);
  const scheduledDates = scheduleKeys
    .map(k => k.split('|')[0])
    .filter(d => isInRange(d, filterRange));

  const datesToInspect =
    filterPeriod === 'day' && scheduledDates.length === 0
      ? [filterDate]
      : Array.from(new Set(scheduledDates)).sort();

  const results: {
    date: string;
    agent: string;
    start: string;
    end: string;
    grace: string | number;
    login: string;
    status: string;
    late: string;
  }[] = [];

  for (const a of activeAgents) {
    for (const d of datesToInspect) {
      const x = getAttendanceResult(a.name, d, state);
      results.push({
        date: d,
        agent: a.name,
        start: x.schedule?.start || '—',
        end: x.schedule?.end || '—',
        grace: x.schedule?.grace ?? '—',
        login: x.firstLogin,
        status: x.status,
        late: x.late,
      });
    }
  }

  return (
    <div className="space-y-3">
      {/* Schedule Configuration Panel */}
      <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-[15px]">
        <h2 className="text-[17px] font-bold text-[#17253b] mb-3">Employee schedule — per day</h2>
        <div className="flex flex-wrap gap-2.5 items-end">
          <label className="flex flex-col gap-1 min-w-[130px]">
            <span className="text-xs font-medium text-[#475569]">Date</span>
            <input
              type="date"
              value={scheduleDate}
              onChange={e => setScheduleDate(e.target.value)}
              className="p-2 border border-[#cbd5e1] rounded-[7px] text-sm bg-white text-[#17253b] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
            />
          </label>

          <label className="flex flex-col gap-1 min-w-[150px]">
            <span className="text-xs font-medium text-[#475569]">Employee</span>
            <select
              value={scheduleAgent}
              onChange={e => setScheduleAgent(e.target.value)}
              className="p-2 border border-[#cbd5e1] rounded-[7px] text-sm bg-white text-[#17253b] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
            >
              {agents.map(a => (
                <option key={a.id} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 min-w-[120px]">
            <span className="text-xs font-medium text-[#475569]">Day status</span>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as DayStatus)}
              className="p-2 border border-[#cbd5e1] rounded-[7px] text-sm bg-white text-[#17253b] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
            >
              <option value="Work">Work</option>
              <option value="OFF">OFF</option>
              <option value="Leave">Leave</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 min-w-[110px]">
            <span className="text-xs font-medium text-[#475569]">Start</span>
            <input
              type="time"
              value={start}
              onChange={e => setStart(e.target.value)}
              className="p-2 border border-[#cbd5e1] rounded-[7px] text-sm bg-white text-[#17253b] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
            />
          </label>

          <label className="flex flex-col gap-1 min-w-[110px]">
            <span className="text-xs font-medium text-[#475569]">End</span>
            <input
              type="time"
              value={end}
              onChange={e => setEnd(e.target.value)}
              className="p-2 border border-[#cbd5e1] rounded-[7px] text-sm bg-white text-[#17253b] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
            />
          </label>

          <label className="flex flex-col gap-1 min-w-[110px]">
            <span className="text-xs font-medium text-[#475569]">Grace minutes</span>
            <input
              type="number"
              min={0}
              value={grace}
              onChange={e => setGrace(Number(e.target.value))}
              className="p-2 border border-[#cbd5e1] rounded-[7px] text-sm bg-white text-[#17253b] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
            />
          </label>

          <button
            onClick={handleSaveSchedule}
            className="px-3.5 py-2 rounded-[7px] text-sm font-medium bg-[#2563eb] text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            Save schedule
          </button>
        </div>

        {message && (
          <div className="mt-2 text-xs font-medium text-emerald-600">{message}</div>
        )}
      </div>

      {/* Attendance Results Panel */}
      <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-[15px]">
        <h2 className="text-[17px] font-bold text-[#17253b] mb-3">Attendance results</h2>
        <div className="overflow-x-auto">
          <table className="rtm-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Agent</th>
                <th>Scheduled start</th>
                <th>Scheduled end</th>
                <th>Grace</th>
                <th>First login</th>
                <th>Status</th>
                <th>Late minutes</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-[#718096]">
                    No attendance records found.
                  </td>
                </tr>
              ) : (
                results.map((r, idx) => {
                  let statusBadgeClass = 'text-slate-600';
                  if (r.status === 'On Time') statusBadgeClass = 'text-emerald-700 font-semibold';
                  else if (r.status === 'Late') statusBadgeClass = 'text-amber-700 font-semibold';
                  else if (r.status === 'Absent') statusBadgeClass = 'text-rose-700 font-semibold';
                  else if (r.status === 'OFF' || r.status === 'Leave')
                    statusBadgeClass = 'text-blue-700 font-semibold';

                  return (
                    <tr key={`${r.date}-${r.agent}-${idx}`}>
                      <td>{r.date}</td>
                      <td className="font-semibold text-[#17253b]">{r.agent}</td>
                      <td>{r.start}</td>
                      <td>{r.end}</td>
                      <td>{r.grace}</td>
                      <td>{r.login}</td>
                      <td className={statusBadgeClass}>{r.status}</td>
                      <td>{r.late}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

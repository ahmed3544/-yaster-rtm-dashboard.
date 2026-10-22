import React, { useState, useEffect } from 'react';
import { Agent, AppState, DateRange } from '../types';
import { getField, parseMs, dateOf, matchAgent } from '../utils/csvParser';
import { formatClock, isInRange, getBreakPlan } from '../utils/metrics';

interface BreakComplianceTabProps {
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  agents: Agent[];
  filterRange: DateRange;
  selectedAgent: string;
  filterDate: string;
}

export const BreakComplianceTab: React.FC<BreakComplianceTabProps> = ({
  state,
  onUpdateState,
  agents,
  filterRange,
  selectedAgent,
  filterDate,
}) => {
  const [breakDate, setBreakDate] = useState<string>(filterDate || new Date().toISOString().slice(0, 10));
  const [breakAgent, setBreakAgent] = useState<string>(agents[0]?.name || '');
  const [grace, setGrace] = useState<number>(3);
  const [items, setItems] = useState<[string, string, string][]>([
    ['Break 1', '', ''],
    ['Break 2', '', ''],
    ['Break 3', '', ''],
  ]);
  const [message, setMessage] = useState<string>('');

  // Load break schedule when date or agent changes
  useEffect(() => {
    if (!breakAgent || !breakDate) return;
    const plan = getBreakPlan(state, breakAgent, breakDate);
    if (plan) {
      setGrace(plan.grace ?? 3);
      setItems(
        plan.items.length > 0
          ? plan.items
          : [
              ['Break 1', '', ''],
              ['Break 2', '', ''],
              ['Break 3', '', ''],
            ]
      );
    } else {
      setGrace(3);
      setItems([
        ['Break 1', '', ''],
        ['Break 2', '', ''],
        ['Break 3', '', ''],
      ]);
    }
  }, [breakAgent, breakDate, state.breaks]);

  const handleItemChange = (index: number, fieldIndex: 0 | 1 | 2, val: string) => {
    setItems(prev => {
      const copy = [...prev] as [string, string, string][];
      copy[index] = [...copy[index]] as [string, string, string];
      copy[index][fieldIndex] = val;
      return copy;
    });
  };

  const handleAddBreak = () => {
    setItems(prev => [...prev, [`Break ${prev.length + 1}`, '', '']]);
  };

  const handleSaveBreaks = () => {
    if (!breakAgent || !breakDate) return;
    const key = `${breakAgent}|${breakDate}`;
    onUpdateState(prev => ({
      ...prev,
      breaks: {
        ...prev.breaks,
        [key]: {
          grace: Number(grace) || 0,
          items,
        },
      },
    }));
    setMessage('Break plan saved.');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleClearBreaks = () => {
    if (!breakAgent || !breakDate) return;
    const key = `${breakAgent}|${breakDate}`;
    const altKey = `${breakDate}|${breakAgent}`;
    onUpdateState(prev => {
      const updated = { ...prev.breaks };
      delete updated[key];
      delete updated[altKey];
      return {
        ...prev,
        breaks: updated,
      };
    });
    setItems([
      ['Break 1', '', ''],
      ['Break 2', '', ''],
      ['Break 3', '', ''],
    ]);
    setMessage('Break plan cleared.');
    setTimeout(() => setMessage(''), 3000);
  };

  // Calculate break compliance report
  const activeAgents = agents.filter(
    a => !selectedAgent || selectedAgent === 'all' || selectedAgent === a.name
  );

  const reportRows: {
    date: string;
    agent: string;
    name: string;
    plannedWindow: string;
    actualStart: string;
    compliance: string;
    overrun: string;
  }[] = [];

  for (const a of activeAgents) {
    for (const [key, plan] of Object.entries(state.breaks)) {
      const parts = key.split('|');
      let d = '';
      let ag = '';
      if (parts[0] === a.name) {
        ag = parts[0];
        d = parts[1];
      } else if (parts[1] === a.name) {
        d = parts[0];
        ag = parts[1];
      } else {
        continue;
      }

      if (!isInRange(d, filterRange)) continue;

      const actualPauses = state.pause.filter(
        o => ((o._agent as string) || matchAgent(o)) === ag && dateOf(o) === d
      );

      const validItems = plan.items.filter(x => x[1] && x[2]);
      for (const x of validItems) {
        const plannedStartMs = parseMs(x[1]);
        const plannedEndMs = parseMs(x[2]);

        const candidates = actualPauses
          .map(o => ({
            o,
            start: parseMs(getField(o, ['pause', 'pause start', 'start time', 'time', 'start'])),
            end: parseMs(getField(o, ['unpause', 'pause end', 'end time', 'finish time', 'end'])),
          }))
          .filter((c): c is { o: typeof c.o; start: number; end: number | null } => c.start !== null);

        candidates.sort((u, v) => {
          if (plannedStartMs === null) return 0;
          return Math.abs(u.start - plannedStartMs) - Math.abs(v.start - plannedStartMs);
        });

        const match = candidates[0];
        if (!match || plannedStartMs === null) {
          reportRows.push({
            date: d,
            agent: ag,
            name: x[0],
            plannedWindow: `${x[1]}–${x[2]}`,
            actualStart: 'No match',
            compliance: 'Incomplete',
            overrun: '—',
          });
          continue;
        }

        const lateMinutes = Math.max(0, Math.round((match.start - plannedStartMs) / 60000));
        const isLate = lateMinutes > (+plan.grace || 0);

        let overrunText = 'Incomplete';
        if (match.end != null && plannedEndMs != null) {
          const overrunMinutes = Math.max(0, Math.round((match.end - plannedEndMs) / 60000));
          overrunText = `${overrunMinutes} min`;
        }

        reportRows.push({
          date: d,
          agent: ag,
          name: x[0],
          plannedWindow: `${x[1]}–${x[2]}`,
          actualStart: formatClock(match.start),
          compliance: isLate ? 'Late start' : 'On time',
          overrun: overrunText,
        });
      }
    }
  }

  return (
    <div className="space-y-3">
      {/* Schedule Form Panel */}
      <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-[15px]">
        <h2 className="text-[17px] font-bold text-[#17253b] mb-2">Break schedule — per employee/day</h2>
        <div className="flex flex-wrap gap-2.5 items-end mb-3">
          <label className="flex flex-col gap-1 min-w-[130px]">
            <span className="text-xs font-medium text-[#475569]">Date</span>
            <input
              type="date"
              value={breakDate}
              onChange={e => setBreakDate(e.target.value)}
              className="p-2 border border-[#cbd5e1] rounded-[7px] text-sm bg-white text-[#17253b] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
            />
          </label>

          <label className="flex flex-col gap-1 min-w-[150px]">
            <span className="text-xs font-medium text-[#475569]">Employee</span>
            <select
              value={breakAgent}
              onChange={e => setBreakAgent(e.target.value)}
              className="p-2 border border-[#cbd5e1] rounded-[7px] text-sm bg-white text-[#17253b] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
            >
              {agents.map(a => (
                <option key={a.id} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
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
        </div>

        <p className="text-xs text-[#718096] mb-3">
          Enter planned start/end times. Actual pause records are matched by agent and nearest start time when timestamps are available.
        </p>

        {/* Break items list */}
        <div className="space-y-2 mb-4 max-w-2xl">
          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
              <input
                type="text"
                placeholder="Break name"
                value={item[0]}
                onChange={e => handleItemChange(idx, 0, e.target.value)}
                className="p-2 border border-[#cbd5e1] rounded-[7px] text-sm bg-white text-[#17253b]"
              />
              <input
                type="time"
                value={item[1]}
                onChange={e => handleItemChange(idx, 1, e.target.value)}
                className="p-2 border border-[#cbd5e1] rounded-[7px] text-sm bg-white text-[#17253b]"
              />
              <input
                type="time"
                value={item[2]}
                onChange={e => handleItemChange(idx, 2, e.target.value)}
                className="p-2 border border-[#cbd5e1] rounded-[7px] text-sm bg-white text-[#17253b]"
              />
              <span className="text-xs text-[#718096]">Planned start / end</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSaveBreaks}
            className="px-3.5 py-2 rounded-[7px] text-sm font-medium bg-[#2563eb] text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            Save break schedule
          </button>
          <button
            onClick={handleAddBreak}
            className="px-3.5 py-2 border border-[#cbd5e1] rounded-[7px] bg-white text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            + Add break slot
          </button>
          <button
            onClick={handleClearBreaks}
            className="px-3.5 py-2 border border-[#cbd5e1] rounded-[7px] bg-white text-sm font-medium hover:bg-slate-50 transition-colors text-red-600"
          >
            Clear breaks
          </button>
        </div>

        {message && (
          <div className="mt-2 text-xs font-medium text-emerald-600">{message}</div>
        )}
      </div>

      {/* Break Compliance Results Panel */}
      <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-[15px]">
        <h2 className="text-[17px] font-bold text-[#17253b] mb-3">Break compliance</h2>
        <div className="overflow-x-auto">
          <table className="rtm-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Agent</th>
                <th>Break</th>
                <th>Planned window</th>
                <th>Actual start</th>
                <th>Start compliance</th>
                <th>Overrun</th>
              </tr>
            </thead>
            <tbody>
              {reportRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-[#718096]">
                    No break plans configured or matched for this period.
                  </td>
                </tr>
              ) : (
                reportRows.map((r, i) => {
                  let complianceColor = 'text-slate-600';
                  if (r.compliance === 'On time') complianceColor = 'text-emerald-700 font-semibold';
                  else if (r.compliance === 'Late start') complianceColor = 'text-amber-700 font-semibold';
                  else if (r.compliance === 'Incomplete') complianceColor = 'text-slate-500 italic';

                  return (
                    <tr key={`${r.date}-${r.agent}-${r.name}-${i}`}>
                      <td>{r.date}</td>
                      <td className="font-semibold text-[#17253b]">{r.agent}</td>
                      <td>{r.name}</td>
                      <td>{r.plannedWindow}</td>
                      <td>{r.actualStart}</td>
                      <td className={complianceColor}>{r.compliance}</td>
                      <td>{r.overrun}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[#718096] mt-3">
          If Pause Activity lacks recognizable start/end timestamps, the result is Incomplete, not an assumed violation.
        </p>
      </div>
    </div>
  );
};

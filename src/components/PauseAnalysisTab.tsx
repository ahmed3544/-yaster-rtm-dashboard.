import React from 'react';
import { Agent, AppState, DateRange } from '../types';
import { filterRecords, formatDuration } from '../utils/metrics';
import { getField, parseDuration } from '../utils/csvParser';

interface PauseAnalysisTabProps {
  state: AppState;
  agents: Agent[];
  filterRange: DateRange | null;
  selectedAgent: string;
}

export const PauseAnalysisTab: React.FC<PauseAnalysisTabProps> = ({
  state,
  agents,
  filterRange,
  selectedAgent,
}) => {
  const activeAgents = agents.filter(
    a => !selectedAgent || selectedAgent === 'all' || selectedAgent === a.name
  );

  const rows = activeAgents.map(a => {
    const p = filterRecords(state.pause, filterRange, a.name);
    const types = Array.from(
      new Set(
        p.map(o => getField(o, ['pause reason', 'pause name', 'pause type', 'reason'])).filter(Boolean)
      )
    ).join(', ') || '—';

    const totalMinutes = p.reduce(
      (s, o) =>
        s + parseDuration(getField(o, ['total pause time', 'pause duration', 'duration', 'total duration'])),
      0
    );

    return {
      agent: a.name,
      count: p.length,
      totalTime: formatDuration(totalMinutes),
      types,
    };
  });

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-[15px]">
      <h2 className="text-[17px] font-bold text-[#17253b] mb-3">Pause analysis</h2>
      <div className="overflow-x-auto">
        <table className="rtm-table">
          <thead>
            <tr>
              <th>Agent</th>
              <th>Pause records</th>
              <th>Total pause time</th>
              <th>Pause types</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-6 text-[#718096]">
                  No pause records found for this period.
                </td>
              </tr>
            ) : (
              rows.map(r => (
                <tr key={r.agent}>
                  <td className="font-semibold text-[#17253b]">{r.agent}</td>
                  <td>{r.count}</td>
                  <td>{r.totalTime}</td>
                  <td className="text-[#475569]">{r.types}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

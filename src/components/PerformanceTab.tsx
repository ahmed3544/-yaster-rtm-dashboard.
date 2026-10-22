import React from 'react';
import { AgentMetrics } from '../types';
import { formatDuration } from '../utils/metrics';

interface PerformanceTabProps {
  metrics: AgentMetrics[];
}

export const PerformanceTab: React.FC<PerformanceTabProps> = ({ metrics }) => {
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-[15px]">
      <h2 className="text-[17px] font-bold text-[#17253b] mb-3">Agent performance</h2>
      <div className="overflow-x-auto">
        <table className="rtm-table">
          <thead>
            <tr>
              <th>Agent</th>
              <th>Calls</th>
              <th>Answered</th>
              <th>Answer rate</th>
              <th>AHT (min)</th>
              <th>Talk time</th>
              <th>Login time</th>
              <th>Pause time</th>
              <th>Utilization</th>
            </tr>
          </thead>
          <tbody>
            {metrics.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-6 text-[#718096]">
                  No performance records found for this period.
                </td>
              </tr>
            ) : (
              metrics.map(m => {
                const answerRate = m.calls ? `${((m.ans / m.calls) * 100).toFixed(1)}%` : '—';
                const ahtMin = m.ans ? (m.aht / 60).toFixed(2) : '—';
                const util = m.login ? `${m.util.toFixed(1)}%` : '—';

                return (
                  <tr key={m.name}>
                    <td className="font-semibold text-[#17253b]">{m.name}</td>
                    <td>{m.calls}</td>
                    <td>{m.ans}</td>
                    <td>{answerRate}</td>
                    <td>{ahtMin}</td>
                    <td>{formatDuration(m.talk / 60)}</td>
                    <td>{formatDuration(m.login)}</td>
                    <td>{formatDuration(m.pause)}</td>
                    <td>{util}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

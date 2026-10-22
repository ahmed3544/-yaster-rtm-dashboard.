import React from 'react';
import { AgentMetrics, AppState } from '../types';
import { formatDuration } from '../utils/metrics';

interface OverviewTabProps {
  metrics: AgentMetrics[];
  state: AppState;
  onNavigateToImports: () => void;
  onExportCsv: () => void;
  onClearData: () => void;
  onLoadSystemSheets?: () => void;
  isLoadingSystem?: boolean;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  metrics,
  state,
  onNavigateToImports,
  onExportCsv,
  onClearData,
  onLoadSystemSheets,
  isLoadingSystem,
}) => {
  const sum = metrics.reduce(
    (acc, m) => ({
      calls: acc.calls + m.calls,
      ans: acc.ans + m.ans,
      aband: acc.aband + m.aband,
      talk: acc.talk + m.talk,
      login: acc.login + m.login,
      pause: acc.pause + m.pause,
    }),
    { calls: 0, ans: 0, aband: 0, talk: 0, login: 0, pause: 0 }
  );

  const avgAhtStr =
    sum.ans > 0 ? `${(sum.talk / sum.ans / 60).toFixed(2)} min` : '—';

  const reportsImportedCount =
    (state.cdr.length > 0 ? 1 : 0) +
    (state.login.length > 0 ? 1 : 0) +
    (state.pause.length > 0 ? 1 : 0);

  const kpis = [
    { label: 'Calls', value: sum.calls.toString(), sub: 'Matched CDR rows' },
    { label: 'Answered', value: sum.ans.toString(), sub: 'ANSWERED status' },
    { label: 'Abandoned', value: sum.aband.toString(), sub: 'Needs CDR' },
    { label: 'Average AHT', value: avgAhtStr, sub: 'Answered calls with duration' },
    { label: 'Staff login time', value: formatDuration(sum.login), sub: 'Imported login seconds' },
    { label: 'Total pause time', value: formatDuration(sum.pause), sub: 'Imported pause duration' },
    {
      label: 'Handling time',
      value: sum.talk > 0 ? formatDuration(sum.talk / 60) : '—',
      sub: 'Answered calls only',
    },
    {
      label: 'Reports imported',
      value: `${reportsImportedCount}/3`,
      sub: 'CSV import',
    },
  ];

  const reportStatus = [
    {
      name: 'CDR',
      status: state.cdr.length > 0 ? 'Imported' : 'Not imported',
      rows: state.cdr.length,
      last: state.meta.cdr || '—',
    },
    {
      name: 'Agent Login Activity',
      status: state.login.length > 0 ? 'Imported' : 'Not imported',
      rows: state.login.length,
      last: state.meta.login || '—',
    },
    {
      name: 'Agent Pause Activity',
      status: state.pause.length > 0 ? 'Imported' : 'Not imported',
      rows: state.pause.length,
      last: state.meta.pause || '—',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#e2e8f0] rounded-[10px] p-3.5">
        <div>
          <span className="text-sm font-semibold text-[#17253b]">
            Imported performance summary
          </span>
          <p className="text-xs text-[#718096]">
            Aggregate workforce metrics calculated from imported Yeastar CSV reports.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onLoadSystemSheets && (
            <button
              onClick={onLoadSystemSheets}
              disabled={isLoadingSystem}
              className="px-3 py-1.5 rounded-[7px] bg-[#101c33] text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs disabled:opacity-50"
              title="Load the 3 attached Yeastar sheets (CDR, Login & Pause Activity)"
            >
              {isLoadingSystem ? 'Loading sheets...' : '⚡ Load System Yeastar Sheets'}
            </button>
          )}
          <button
            onClick={onExportCsv}
            className="px-3 py-1.5 border border-[#cbd5e1] rounded-[7px] bg-white text-xs font-semibold text-[#1e293b] hover:bg-slate-50 transition-colors shadow-xs"
          >
            Export summary CSV
          </button>
          <button
            onClick={onClearData}
            className="px-3 py-1.5 border border-[#cbd5e1] rounded-[7px] bg-white text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors shadow-xs"
          >
            Clear data
          </button>
        </div>
      </div>

      {/* Info notice */}
      <div className="bg-[#eff6ff] text-[#1e40af] p-3 rounded-[8px] text-xs flex items-center justify-between flex-wrap gap-2">
        <span>
          Import-only mode: Data comes from manually imported CSVs and is stored in this browser. No live queue or agent status.
        </span>
        {state.cdr.length > 0 && (
          <span className="font-semibold text-blue-800">
            {state.cdr.length.toLocaleString()} CDR calls loaded
          </span>
        )}
      </div>

      {/* 8 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {kpis.map(kpi => (
          <div
            key={kpi.label}
            className="bg-white border border-[#e2e8f0] rounded-[10px] p-[15px]"
          >
            <div className="text-xs text-[#718096] font-medium tracking-wide">
              {kpi.label}
            </div>
            <div className="text-[25px] font-bold mt-1 text-[#17253b]">
              {kpi.value}
            </div>
            <div className="text-[11px] text-[#94a3b8] mt-1 font-normal">
              {kpi.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Import Status Section */}
      <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-[15px]">
        <div className="flex flex-wrap items-center justify-between mb-3 gap-2">
          <div>
            <h2 className="text-[17px] font-bold text-[#17253b]">Import status</h2>
            <div className="text-xs text-[#718096] mt-0.5">Upload the three exports.</div>
          </div>
          <div className="flex items-center gap-2">
            {onLoadSystemSheets && (
              <button
                onClick={onLoadSystemSheets}
                disabled={isLoadingSystem}
                className="px-3 py-1.5 rounded-[7px] border border-[#cbd5e1] bg-white text-xs font-semibold text-[#1e293b] hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50"
              >
                {isLoadingSystem ? 'Loading...' : 'Load attached sheets'}
              </button>
            )}
            <button
              onClick={onNavigateToImports}
              className="px-3 py-1.5 rounded-[7px] bg-[#2563eb] text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
              Import reports
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="rtm-table">
            <thead>
              <tr>
                <th>Report</th>
                <th>Status</th>
                <th>Rows</th>
                <th>Last import</th>
              </tr>
            </thead>
            <tbody>
              {reportStatus.map(r => (
                <tr key={r.name}>
                  <td className="font-semibold text-[#17253b]">{r.name}</td>
                  <td>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        r.status === 'Imported'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="font-mono text-sm">{r.rows}</td>
                  <td className="text-[#64748b] text-xs">{r.last}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Agent Snapshot Section */}
      <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-[15px]">
        <h2 className="text-[17px] font-bold text-[#17253b]">Agent snapshot</h2>
        <div className="text-xs text-[#718096] mt-0.5 mb-3">
          Recognized agents only; extension IDs are hidden.
        </div>
        <div className="overflow-x-auto">
          <table className="rtm-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Calls</th>
                <th>Answered</th>
                <th>Abandoned</th>
                <th>Answer rate</th>
                <th>AHT</th>
                <th>Login time</th>
                <th>Pause time</th>
              </tr>
            </thead>
            <tbody>
              {metrics.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-[#718096]">
                    No agent records found.
                  </td>
                </tr>
              ) : (
                metrics.map(m => {
                  const answerRate =
                    m.calls > 0 ? `${((m.ans / m.calls) * 100).toFixed(1)}%` : '—';
                  const ahtStr =
                    m.ans > 0 ? `${(m.aht / 60).toFixed(2)} min` : '—';

                  return (
                    <tr key={m.name}>
                      <td className="font-semibold text-[#17253b]">{m.name}</td>
                      <td className="font-semibold">{m.calls.toLocaleString()}</td>
                      <td className="text-emerald-700 font-medium">{m.ans.toLocaleString()}</td>
                      <td className="text-rose-700 font-medium">{m.aband.toLocaleString()}</td>
                      <td>{answerRate}</td>
                      <td>{ahtStr}</td>
                      <td>{formatDuration(m.login)}</td>
                      <td>{formatDuration(m.pause)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-center text-xs text-[#94a3b8] py-2">
        Import-only dashboard · Stored in this browser. Re-import files to refresh.
      </div>
    </div>
  );
};

import React, { useRef, useState } from 'react';
import { Agent, AppState } from '../types';
import { parseCSV, extractRecords, prepRecords, reindexRecords } from '../utils/csvParser';
import { downloadJsonFile } from '../utils/storage';

interface ImportsTabProps {
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  agents: Agent[];
  onLoadSystemSheets?: () => void;
  isLoadingSystem?: boolean;
}

export const ImportsTab: React.FC<ImportsTabProps> = ({
  state,
  onUpdateState,
  agents,
  onLoadSystemSheets,
  isLoadingSystem,
}) => {
  const cdrInputRef = useRef<HTMLInputElement>(null);
  const loginInputRef = useRef<HTMLInputElement>(null);
  const pauseInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const [message, setMessage] = useState<string>('');
  const [isError, setIsError] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleImportFiles = async () => {
    setMessage('');
    setIsError(false);
    setIsProcessing(true);

    try {
      const cdrFile = cdrInputRef.current?.files?.[0];
      const loginFile = loginInputRef.current?.files?.[0];
      const pauseFile = pauseInputRef.current?.files?.[0];

      if (!cdrFile && !loginFile && !pauseFile) {
        throw new Error('Choose at least one CSV');
      }

      const tasks: { type: 'cdr' | 'login' | 'pause'; file: File; need: string[] }[] = [];
      if (cdrFile) tasks.push({ type: 'cdr', file: cdrFile, need: ['call from'] });
      if (loginFile) tasks.push({ type: 'login', file: loginFile, need: ['logged in'] });
      if (pauseFile) tasks.push({ type: 'pause', file: pauseFile, need: ['pause', 'total pause time'] });

      const resultsSummary: string[] = [];
      const updates: Partial<AppState> = {};
      const newMeta = { ...state.meta };

      for (const task of tasks) {
        const text = await task.file.text();
        const rawRows = parseCSV(text);
        let records = extractRecords(rawRows, task.need);
        // Fallback: if header search failed, try with first row as header
        if (!records.length && rawRows.length > 1) {
          records = extractRecords(rawRows, []);
        }
        if (!records.length) {
          throw new Error(`No data rows detected for ${task.file.name}`);
        }
        const prepped = prepRecords(records, agents);
        updates[task.type] = prepped;
        newMeta[task.type] = `${task.file.name} · ${new Date().toLocaleString()}`;
        resultsSummary.push(`${task.type}: ${prepped.length}`);
      }

      onUpdateState(prev => ({
        ...prev,
        ...updates,
        meta: newMeta,
      }));

      // Reset file inputs
      if (cdrInputRef.current) cdrInputRef.current.value = '';
      if (loginInputRef.current) loginInputRef.current.value = '';
      if (pauseInputRef.current) pauseInputRef.current.value = '';

      setMessage(`Imported: ${resultsSummary.join(' · ')}`);
      setIsError(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage(`Import error: ${msg}`);
      setIsError(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReindex = () => {
    onUpdateState(prev => ({
      ...prev,
      cdr: reindexRecords(prev.cdr, agents),
      login: reindexRecords(prev.login, agents),
      pause: reindexRecords(prev.pause, agents),
    }));
    setMessage('All imported records re-indexed against agent list.');
    setIsError(false);
  };

  const handleBackupDownload = () => {
    downloadJsonFile('yaster-rtm-backup.json', state);
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Invalid JSON');
      }

      const restoredCdr = reindexRecords(Array.isArray(parsed.cdr) ? parsed.cdr : [], agents);
      const restoredLogin = reindexRecords(Array.isArray(parsed.login) ? parsed.login : [], agents);
      const restoredPause = reindexRecords(Array.isArray(parsed.pause) ? parsed.pause : [], agents);

      onUpdateState(prev => ({
        ...prev,
        ...parsed,
        cdr: restoredCdr,
        login: restoredLogin,
        pause: restoredPause,
      }));

      setMessage('Backup restored and re-indexed.');
      setIsError(false);
    } catch (err) {
      setMessage('Invalid backup file');
      setIsError(true);
    } finally {
      if (restoreInputRef.current) restoreInputRef.current.value = '';
    }
  };

  const handleClearReports = () => {
    if (window.confirm('Clear imported reports? Schedules and break plans will remain.')) {
      onUpdateState(prev => ({
        ...prev,
        cdr: [],
        login: [],
        pause: [],
        meta: {},
      }));
      setMessage('Imported reports cleared.');
      setIsError(false);
    }
  };

  const summary = [
    {
      report: 'CDR',
      rows: state.cdr.length,
      dated: state.cdr.filter(x => x._date).length,
      last: state.meta.cdr || '—',
    },
    {
      report: 'Agent Login Activity',
      rows: state.login.length,
      dated: state.login.filter(x => x._date).length,
      last: state.meta.login || '—',
    },
    {
      report: 'Agent Pause Activity',
      rows: state.pause.length,
      dated: state.pause.filter(x => x._date).length,
      last: state.meta.pause || '—',
    },
  ];

  return (
    <div className="space-y-3">
      {/* Import Form Panel */}
      <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-[15px]">
        <div className="flex flex-wrap items-center justify-between mb-3 gap-2">
          <h2 className="text-[17px] font-bold text-[#17253b]">Import Yeastar CSV files</h2>
          {onLoadSystemSheets && (
            <button
              onClick={onLoadSystemSheets}
              disabled={isLoadingSystem}
              className="px-3.5 py-1.5 rounded-[7px] bg-[#101c33] text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs disabled:opacity-50"
            >
              {isLoadingSystem ? 'Loading...' : '⚡ Load System Yeastar Sheets (Attached)'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <div className="border border-dashed border-[#94a3b8] p-3 rounded-[8px] bg-slate-50/50">
            <span className="font-semibold text-xs text-[#1e293b]">CDR</span>
            <input
              ref={cdrInputRef}
              type="file"
              accept=".csv,.txt"
              className="w-full mt-2 text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border file:border-slate-300 file:text-xs file:bg-white hover:file:bg-slate-100"
            />
          </div>

          <div className="border border-dashed border-[#94a3b8] p-3 rounded-[8px] bg-slate-50/50">
            <span className="font-semibold text-xs text-[#1e293b]">Agent Login Activity</span>
            <input
              ref={loginInputRef}
              type="file"
              accept=".csv,.txt"
              className="w-full mt-2 text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border file:border-slate-300 file:text-xs file:bg-white hover:file:bg-slate-100"
            />
          </div>

          <div className="border border-dashed border-[#94a3b8] p-3 rounded-[8px] bg-slate-50/50">
            <span className="font-semibold text-xs text-[#1e293b]">Agent Pause Activity</span>
            <input
              ref={pauseInputRef}
              type="file"
              accept=".csv,.txt"
              className="w-full mt-2 text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border file:border-slate-300 file:text-xs file:bg-white hover:file:bg-slate-100"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={handleImportFiles}
            disabled={isProcessing}
            className="px-3.5 py-2 rounded-[7px] text-sm font-medium bg-[#2563eb] text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isProcessing ? 'Importing...' : 'Import selected files'}
          </button>

          <button
            onClick={handleReindex}
            className="px-3.5 py-2 border border-[#cbd5e1] rounded-[7px] bg-white text-sm font-medium hover:bg-slate-50 transition-colors"
            title="Re-match agent IDs and dates on previously imported rows"
          >
            Re-index existing data
          </button>

          <button
            onClick={handleBackupDownload}
            className="px-3.5 py-2 border border-[#cbd5e1] rounded-[7px] bg-white text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Download backup
          </button>

          <label className="px-3.5 py-2 border border-[#cbd5e1] rounded-[7px] bg-white text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer">
            Restore backup
            <input
              ref={restoreInputRef}
              type="file"
              hidden
              accept=".json"
              onChange={handleRestoreFile}
            />
          </label>

          <button
            onClick={handleClearReports}
            className="px-3.5 py-2 border border-[#cbd5e1] rounded-[7px] bg-white text-sm font-medium hover:bg-slate-50 transition-colors text-red-600 hover:text-red-700"
          >
            Clear imported data
          </button>
        </div>

        {message && (
          <div
            className={`mt-3 text-xs font-medium p-2 rounded ${
              isError
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {message}
          </div>
        )}

        <p className="text-xs text-[#718096] mt-3">
          Data is stored in this browser. Import each report again on a new device.
        </p>
      </div>

      {/* Summary Table Panel */}
      <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-[15px]">
        <h2 className="text-[17px] font-bold text-[#17253b] mb-3">Import summary</h2>
        <div className="overflow-x-auto">
          <table className="rtm-table">
            <thead>
              <tr>
                <th>Report</th>
                <th>Rows</th>
                <th>Rows with dates</th>
                <th>Last import</th>
              </tr>
            </thead>
            <tbody>
              {summary.map(s => (
                <tr key={s.report}>
                  <td className="font-semibold text-[#17253b]">{s.report}</td>
                  <td>{s.rows}</td>
                  <td>{s.dated}</td>
                  <td className="text-[#64748b]">{s.last}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

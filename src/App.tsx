import React, { useState, useEffect, useMemo } from 'react';
import { AppState, TabType, PeriodType, DateRange, Agent } from './types';
import { loadState, saveState, downloadCsvFile } from './utils/storage';
import { DEFAULT_AGENTS } from './utils/csvParser';
import { calculateMetrics, formatDuration } from './utils/metrics';
import { loadSystemYeastarData } from './utils/defaultData';
import { Sidebar } from './components/Sidebar';
import { Filters } from './components/Filters';
import { OverviewTab } from './components/OverviewTab';
import { ImportsTab } from './components/ImportsTab';
import { PerformanceTab } from './components/PerformanceTab';
import { AttendanceTab } from './components/AttendanceTab';
import { BreakComplianceTab } from './components/BreakComplianceTab';
import { PauseAnalysisTab } from './components/PauseAnalysisTab';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [state, setState] = useState<AppState>(() => loadState());
  const [isLoadingSystem, setIsLoadingSystem] = useState<boolean>(false);

  // Date and filter states. Default to 'all' so overall imported stats are instantly visible.
  const [period, setPeriod] = useState<PeriodType>('all');
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [agents] = useState<Agent[]>(DEFAULT_AGENTS);

  // Sync state to localStorage whenever it changes
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Load attached system sheets if local state has no records
  useEffect(() => {
    if (state.cdr.length === 0 && state.login.length === 0) {
      setIsLoadingSystem(true);
      loadSystemYeastarData(agents)
        .then(loaded => {
          setState(prev => {
            const next = { ...prev, ...loaded };
            saveState(next);
            return next;
          });
        })
        .catch(err => {
          console.warn('Auto-load of system sheets skipped or unavailable:', err);
        })
        .finally(() => {
          setIsLoadingSystem(false);
        });
    }
  }, [agents]);

  const handleLoadSystemSheets = async () => {
    setIsLoadingSystem(true);
    try {
      const loaded = await loadSystemYeastarData(agents);
      handleUpdateState(prev => ({
        ...prev,
        ...loaded,
      }));
    } catch (e) {
      console.error('Failed to load system sheets:', e);
      alert('Could not load the attached sheets. Please verify the file paths.');
    } finally {
      setIsLoadingSystem(false);
    }
  };

  // Compute active date range based on period
  const filterRange: DateRange | null = useMemo(() => {
    if (period === 'all') {
      return null; // Include all dates
    }
    if (period === 'month') {
      const monthPrefix = date.slice(0, 7);
      return {
        s: `${monthPrefix}-01`,
        e: date,
      };
    }
    return {
      s: date,
      e: date,
    };
  }, [period, date]);

  // Compute metrics for Overview and Performance tabs
  const metrics = useMemo(() => {
    const targetAgents = agents.filter(
      a => selectedAgent === 'all' || selectedAgent === a.name
    );
    return targetAgents.map(a => calculateMetrics(a.name, filterRange, state));
  }, [agents, selectedAgent, filterRange, state]);

  // Header Title mapping
  const tabTitles: Record<TabType, string> = {
    overview: 'RTM Operations Dashboard',
    imports: 'Import Data',
    performance: 'Agent Performance',
    attendance: 'Attendance & Schedule',
    breaks: 'Break Compliance',
    pause: 'Pause Analysis',
  };

  const handleUpdateState = (updater: (prev: AppState) => AppState) => {
    setState(prev => {
      const updated = updater(prev);
      saveState(updated);
      return updated;
    });
  };

  const handleClearData = () => {
    if (window.confirm('Clear imported reports? Schedules and break plans will remain.')) {
      handleUpdateState(prev => ({
        ...prev,
        cdr: [],
        login: [],
        pause: [],
        meta: {},
      }));
    }
  };

  const handleExportSummaryCsv = () => {
    const headers = [
      'Agent',
      'Calls',
      'Answered',
      'Abandoned',
      'Answer Rate',
      'AHT (min)',
      'Talk Time',
      'Login Time',
      'Pause Time',
      'Utilization',
      'Occupancy',
    ];

    const rows = metrics.map(m => {
      const answerRate = m.calls > 0 ? `${((m.ans / m.calls) * 100).toFixed(1)}%` : '—';
      const ahtMin = m.ans > 0 ? (m.aht / 60).toFixed(2) : '—';
      const talkTime = formatDuration(m.talk / 60);
      const loginTime = formatDuration(m.login);
      const pauseTime = formatDuration(m.pause);
      const util = m.login > 0 ? `${m.util.toFixed(1)}%` : '—';
      const occup = m.login > 0 ? `${m.occup.toFixed(1)}%` : '—';

      return [
        `"${m.name}"`,
        m.calls,
        m.ans,
        m.aband,
        `"${answerRate}"`,
        `"${ahtMin}"`,
        `"${talkTime}"`,
        `"${loginTime}"`,
        `"${pauseTime}"`,
        `"${util}"`,
        `"${occup}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    downloadCsvFile('yaster-rtm-summary.csv', csvContent);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f3f6fb] text-[#17253b]">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-[22px] min-w-0 max-w-[1500px] mx-auto w-full">
        {/* Category breadcrumb */}
        <div className="text-xs text-[#718096] uppercase tracking-wider font-semibold">
          WORKFORCE MANAGEMENT
        </div>

        {/* Page Title & Subtitle */}
        <div className="flex flex-wrap items-baseline justify-between gap-2 mt-2 mb-3">
          <h1 className="text-2xl font-bold text-[#17253b]">
            {tabTitles[activeTab]}
          </h1>
          {activeTab === 'overview' && (
            <span className="text-xs text-[#718096]">
              Imported performance summary
            </span>
          )}
        </div>

        {/* Filters (Hidden when on Import Data tab, as in original) */}
        {activeTab !== 'imports' && (
          <Filters
            period={period}
            setPeriod={setPeriod}
            date={date}
            setDate={setDate}
            selectedAgent={selectedAgent}
            setSelectedAgent={setSelectedAgent}
            agents={agents}
            onApply={() => {}}
          />
        )}

        {/* Tab Views */}
        {activeTab === 'overview' && (
          <OverviewTab
            metrics={metrics}
            state={state}
            onNavigateToImports={() => setActiveTab('imports')}
            onExportCsv={handleExportSummaryCsv}
            onClearData={handleClearData}
            onLoadSystemSheets={handleLoadSystemSheets}
            isLoadingSystem={isLoadingSystem}
          />
        )}

        {activeTab === 'imports' && (
          <ImportsTab
            state={state}
            onUpdateState={handleUpdateState}
            agents={agents}
            onLoadSystemSheets={handleLoadSystemSheets}
            isLoadingSystem={isLoadingSystem}
          />
        )}

        {activeTab === 'performance' && <PerformanceTab metrics={metrics} />}

        {activeTab === 'attendance' && (
          <AttendanceTab
            state={state}
            onUpdateState={handleUpdateState}
            agents={agents}
            filterRange={filterRange || { s: date, e: date }}
            selectedAgent={selectedAgent}
            filterPeriod={period === 'all' ? 'day' : period}
            filterDate={date}
          />
        )}

        {activeTab === 'breaks' && (
          <BreakComplianceTab
            state={state}
            onUpdateState={handleUpdateState}
            agents={agents}
            filterRange={filterRange || { s: date, e: date }}
            selectedAgent={selectedAgent}
            filterDate={date}
          />
        )}

        {activeTab === 'pause' && (
          <PauseAnalysisTab
            state={state}
            agents={agents}
            filterRange={filterRange || { s: date, e: date }}
            selectedAgent={selectedAgent}
          />
        )}
      </main>
    </div>
  );
};

export default App;

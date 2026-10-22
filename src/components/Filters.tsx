import React from 'react';
import { Agent, PeriodType } from '../types';

interface FiltersProps {
  period: PeriodType;
  setPeriod: (p: PeriodType) => void;
  date: string;
  setDate: (d: string) => void;
  selectedAgent: string;
  setSelectedAgent: (a: string) => void;
  agents: Agent[];
  onApply: () => void;
}

export const Filters: React.FC<FiltersProps> = ({
  period,
  setPeriod,
  date,
  setDate,
  selectedAgent,
  setSelectedAgent,
  agents,
  onApply,
}) => {
  return (
    <section className="bg-white border border-[#e2e8f0] rounded-[10px] p-[15px] my-3">
      <h2 className="text-[17px] font-bold text-[#17253b] mb-3">Report filters</h2>
      <div className="flex flex-wrap gap-2.5 items-end">
        <label className="flex flex-col gap-1 min-w-[150px]">
          <span className="text-xs font-medium text-[#475569]">Period</span>
          <select
            value={period}
            onChange={e => setPeriod(e.target.value as PeriodType)}
            className="p-2 border border-[#cbd5e1] rounded-[7px] text-sm bg-white text-[#17253b] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
          >
            <option value="all">All Imported Data (Overall)</option>
            <option value="day">Daily</option>
            <option value="month">Monthly (MTD)</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 min-w-[130px]">
          <span className="text-xs font-medium text-[#475569]">
            Date {period === 'all' && <span className="text-slate-400 font-normal">(ignored)</span>}
          </span>
          <input
            type="date"
            value={date}
            disabled={period === 'all'}
            onChange={e => setDate(e.target.value)}
            className={`p-2 border border-[#cbd5e1] rounded-[7px] text-sm bg-white text-[#17253b] focus:outline-none focus:ring-1 focus:ring-[#2563eb] ${
              period === 'all' ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''
            }`}
          />
        </label>

        <label className="flex flex-col gap-1 min-w-[150px]">
          <span className="text-xs font-medium text-[#475569]">Agent</span>
          <select
            value={selectedAgent}
            onChange={e => setSelectedAgent(e.target.value)}
            className="p-2 border border-[#cbd5e1] rounded-[7px] text-sm bg-white text-[#17253b] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
          >
            <option value="all">All employees</option>
            {agents.map(a => (
              <option key={a.id} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={onApply}
          className="px-3.5 py-2 border border-[#cbd5e1] rounded-[7px] bg-white text-sm font-medium hover:bg-slate-50 transition-colors shadow-xs"
        >
          Apply
        </button>
      </div>

      <p className="text-xs text-[#718096] mt-2.5">
        {period === 'all' && 'Showing all imported records across all dates in the browser.'}
        {period === 'day' && 'Daily filter evaluates records for the exact selected date.'}
        {period === 'month' && 'MTD includes the first day of the selected month through the selected date.'}
      </p>
    </section>
  );
};

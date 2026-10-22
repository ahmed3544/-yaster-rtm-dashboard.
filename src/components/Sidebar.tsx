import React from 'react';
import { TabType } from '../types';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const TABS: { id: TabType; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'imports', label: 'Import Data' },
  { id: 'performance', label: 'Agent Performance' },
  { id: 'attendance', label: 'Attendance & Schedule' },
  { id: 'breaks', label: 'Break Compliance' },
  { id: 'pause', label: 'Pause Analysis' },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  return (
    <aside className="bg-[#101c33] text-white p-5 flex flex-col justify-between min-w-[210px] w-full md:w-[220px]">
      <div>
        <div className="font-bold text-[20px] tracking-wide">YASTER RTM</div>
        <div className="text-xs text-[#aabbd3] mt-1.5">Operations · Import Data</div>

        <nav className="mt-5 space-y-2">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`w-full text-left p-[11px] rounded-[7px] text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#30476c] text-white font-semibold'
                    : 'bg-transparent text-[#dbeafe] hover:bg-[#1e2f4f]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-8 pt-4 border-t border-[#1e2f4f] text-[11px] text-[#aabbd3] leading-relaxed">
        <p className="font-semibold text-white/90">LOCAL DATA MODE</p>
        <p>No live Yeastar API connection.</p>
      </div>
    </aside>
  );
};

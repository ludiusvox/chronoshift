import React from 'react';
import { Clock, Calendar, Coffee, Database, Share2 } from 'lucide-react';

interface MobileNavProps {
  activeTab: 'timesheet' | 'punch' | 'timer' | 'database';
  onChangeTab: (tab: 'timesheet' | 'punch' | 'timer' | 'database') => void;
  onOpenExport: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onChangeTab,
  onOpenExport,
}) => {
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe">
      <div className="grid grid-cols-5 h-16 items-center px-1">
        {/* Timesheet */}
        <button
          onClick={() => onChangeTab('timesheet')}
          className={`flex flex-col items-center justify-center h-full transition ${
            activeTab === 'timesheet'
              ? 'text-sky-600 dark:text-sky-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Calendar className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">14 Days</span>
        </button>

        {/* Punch Clock */}
        <button
          onClick={() => onChangeTab('punch')}
          className={`flex flex-col items-center justify-center h-full transition ${
            activeTab === 'punch'
              ? 'text-sky-600 dark:text-sky-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Punch</span>
        </button>

        {/* Break Timer */}
        <button
          onClick={() => onChangeTab('timer')}
          className={`flex flex-col items-center justify-center h-full transition ${
            activeTab === 'timer'
              ? 'text-sky-600 dark:text-sky-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Coffee className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Timer</span>
        </button>

        {/* Export Modal */}
        <button
          onClick={onOpenExport}
          className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition"
        >
          <Share2 className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Export</span>
        </button>

        {/* Database */}
        <button
          onClick={() => onChangeTab('database')}
          className={`flex flex-col items-center justify-center h-full transition ${
            activeTab === 'database'
              ? 'text-sky-600 dark:text-sky-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Database className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">SQLite</span>
        </button>
      </div>
    </nav>
  );
};

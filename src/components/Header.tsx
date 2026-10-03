import React from 'react';
import { Moon, Sun, Clock, Database, DollarSign, Settings, Share2 } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { PayPeriodSettings } from '../types';

interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  settings: PayPeriodSettings;
  onOpenSettings: () => void;
  onOpenExport: () => void;
  onOpenDatabase: () => void;
  onUpdateRate: (newRate: number) => void;
  sqliteActive: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  darkMode,
  onToggleDarkMode,
  settings,
  onOpenSettings,
  onOpenExport,
  onOpenDatabase,
  onUpdateRate,
  sqliteActive,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md transition-colors pt-safe pb-1">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 min-h-[4rem] py-2 flex items-center justify-between gap-2">
        {/* Logo & Brand */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-sky-500/20 shrink-0">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white truncate">
                ChronoShift
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                14-Day Pay Period
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden xs:block">
              Overtime 1.5x • Break Timers • SQLite
            </p>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Quick Pay Rate Pill */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200/70 dark:hover:bg-slate-700/80 px-2 sm:px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 transition group">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="flex items-center">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 mr-0.5">Rate:</span>
              <input
                type="number"
                step="0.25"
                min="0"
                value={settings.hourlyRate}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val >= 0) {
                    onUpdateRate(val);
                  }
                }}
                className="w-14 sm:w-16 bg-transparent text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 rounded px-1 py-0"
                title="Hourly Pay Rate"
              />
              <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">/hr</span>
            </div>
          </div>

          {/* SQLite DB pill indicator */}
          <button
            onClick={onOpenDatabase}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Embedded SQLite Database Inspector"
          >
            <Database className={`w-3.5 h-3.5 ${sqliteActive ? 'text-indigo-500 animate-pulse' : 'text-slate-400'}`} />
            <span className="hidden md:inline">SQLite</span>
          </button>

          {/* Export to SMS/Email button */}
          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition active:scale-95"
            title="Export to SMS or Email clipboard"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* PWA Install */}
          <PWAInstallButton />

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Settings & Overtime Rules"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Dark / Light Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {darkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

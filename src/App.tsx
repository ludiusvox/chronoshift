/**
 * ChronoShift - 2-Week Timesheet & Break Tracker
 * Features:
 * - 14-Day (2-Week) Pay Period Management
 * - Embedded SQLite Database (sql.js WASM + IndexedDB persistence + .sqlite file export/import)
 * - Light & Dark Mode
 * - Break & Smoke Break Timer with Web Audio sound alert
 * - 15m rest break every 4 hours & 30m lunch break reminders
 * - Overtime calculation (1.5x rate of pay for hours over 40)
 * - Rate of Pay input & instant recalculation
 * - Mobile friendly & Android / PWA ready
 * - Clipboard exports formatted for Text Messages (SMS) and Emails
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Coffee,
  Database,
  Share2,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  Edit3
} from 'lucide-react';
import { Header } from './components/Header';
import { PaySummaryCard } from './components/PaySummaryCard';
import { PunchClock } from './components/PunchClock';
import { TimesheetView } from './components/TimesheetView';
import { BreakTimer } from './components/BreakTimer';
import { ExportModal } from './components/ExportModal';
import { SettingsModal } from './components/SettingsModal';
import { DatabaseViewer } from './components/DatabaseViewer';
import { TimeCardCorrection } from './components/TimeCardCorrection';
import { MobileNav } from './components/MobileNav';

import { ShiftRecord, PayPeriodSettings, BiWeeklyCalculation } from './types';
import {
  getSettings,
  updateSettings,
  getShiftsForPeriod,
  updateShift,
  logBreakEvent
} from './db/sqlite';
import { calculateBiWeeklyPay } from './utils/calculator';
import { playButtonTapSound } from './utils/sound';

export default function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chronoshift_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  // Database & Timesheet state
  const [isDbLoaded, setIsDbLoaded] = useState<boolean>(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [settings, setSettings] = useState<PayPeriodSettings>({
    hourlyRate: 25.0,
    periodStartDate: new Date().toISOString().split('T')[0],
    overtimeThresholdWeekly: 40,
    overtimeMultiplier: 1.5,
    defaultLunchMinutes: 30,
    defaultSmokeMinutes: 7,
    defaultRestMinutes: 15,
    currencySymbol: '$',
    enableDailyOvertime: false,
    dailyOvertimeThreshold: 8,
  });

  const [shifts, setShifts] = useState<ShiftRecord[]>([]);

  // Navigation & Modals state
  const [activeTab, setActiveTab] = useState<'timesheet' | 'punch' | 'timer' | 'correction' | 'database'>('timesheet');
  const [activeWeekTab, setActiveWeekTab] = useState<'all' | 'week1' | 'week2'>('all');
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync theme with document element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('chronoshift_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('chronoshift_theme', 'light');
    }
  }, [darkMode]);

  // Load Settings and Shifts from SQLite on mount
  const loadDatabaseData = async () => {
    try {
      setDbError(null);
      const loadedSettings = await getSettings();
      setSettings(loadedSettings);

      const loadedShifts = await getShiftsForPeriod(loadedSettings.periodStartDate);
      setShifts(loadedShifts);
      setIsDbLoaded(true);
    } catch (err: any) {
      console.error('Failed to load database:', err);
      setDbError(err.message || 'Error initializing SQLite database');
      setIsDbLoaded(true);
    }
  };

  useEffect(() => {
    loadDatabaseData();
  }, []);

  // Recalculate bi-weekly pay whenever shifts or settings update
  const calculation: BiWeeklyCalculation = useMemo(() => {
    return calculateBiWeeklyPay(shifts, settings);
  }, [shifts, settings]);

  // Toast notification helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Handlers for shift updates
  const handleUpdateShift = async (updatedShift: ShiftRecord) => {
    setShifts((prev) => prev.map((s) => (s.id === updatedShift.id ? updatedShift : s)));
    try {
      await updateShift(updatedShift);
    } catch (err) {
      console.error('Failed to save shift to SQLite:', err);
    }
  };

  // Handler for quick pay rate update from Header
  const handleUpdateRate = async (newRate: number) => {
    const updated = { ...settings, hourlyRate: newRate };
    setSettings(updated);
    try {
      await updateSettings(updated);
    } catch (err) {
      console.error('Failed to update rate in SQLite:', err);
    }
  };

  // Handler for full settings save
  const handleSaveSettings = async (newSettings: PayPeriodSettings) => {
    setSettings(newSettings);
    try {
      await updateSettings(newSettings);
      // If start date changed, reload shifts for that period
      if (newSettings.periodStartDate !== settings.periodStartDate) {
        const newShifts = await getShiftsForPeriod(newSettings.periodStartDate);
        setShifts(newShifts);
      }
      showToast('Settings saved successfully!');
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  // Navigate pay period: previous 14 days, next 14 days, or current
  const handleNavigatePeriod = async (direction: 'prev' | 'next' | 'current') => {
    playButtonTapSound();
    let newStart: Date;
    if (direction === 'current') {
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      newStart = new Date(now.setDate(diff));
    } else {
      const cur = new Date(settings.periodStartDate + 'T00:00:00');
      const offset = direction === 'next' ? 14 : -14;
      cur.setDate(cur.getDate() + offset);
      newStart = cur;
    }

    const newStartStr = newStart.toISOString().split('T')[0];
    const updated = { ...settings, periodStartDate: newStartStr };
    setSettings(updated);
    await updateSettings(updated);

    const newShifts = await getShiftsForPeriod(newStartStr);
    setShifts(newShifts);
    showToast(`Switched to period starting ${newStartStr}`);
  };

  const handleChangeStartDate = async (newStartDate: string) => {
    const updated = { ...settings, periodStartDate: newStartDate };
    setSettings(updated);
    await updateSettings(updated);
    const newShifts = await getShiftsForPeriod(newStartDate);
    setShifts(newShifts);
  };

  // Handler to log a finished break directly into today's shift
  const handleLogBreakToShift = async (
    type: 'smoke' | 'rest' | 'lunch' | 'custom',
    durationMinutes: number,
    label: string
  ) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayShift = shifts.find((s) => s.date === todayStr);

    if (!todayShift) {
      showToast('Break logged, but today is outside the current 14-day view.');
      return;
    }

    const nowIso = new Date().toISOString();
    await logBreakEvent({
      shiftDate: todayStr,
      type,
      label,
      durationMinutes,
      isDeducted: type === 'lunch',
      startedAt: new Date(Date.now() - durationMinutes * 60000).toISOString(),
      endedAt: nowIso,
    });

    if (type === 'lunch') {
      const updated = {
        ...todayShift,
        lunchMinutes: (todayShift.lunchMinutes || 0) + durationMinutes,
      };
      await handleUpdateShift(updated);
      showToast(`Added ${durationMinutes}m lunch deduction to today's shift.`);
    } else {
      const updated = {
        ...todayShift,
        breakMinutes: (todayShift.breakMinutes || 0) + durationMinutes,
      };
      await handleUpdateShift(updated);
      showToast(`Logged ${durationMinutes}m ${type} break.`);
    }
  };

  if (!isDbLoaded) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-4 animate-spin">
          <Loader2 className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold">Initializing SQLite Database...</h2>
        <p className="text-xs text-slate-400 mt-1">
          Loading WebAssembly SQLite engine and local storage
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors pb-20 sm:pb-8">
      {/* Top Header */}
      <Header
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        settings={settings}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenDatabase={() => setActiveTab('database')}
        onUpdateRate={handleUpdateRate}
        sqliteActive={!dbError}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-5 w-full space-y-6 grow">
        {/* Error notification if any */}
        {dbError && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>SQLite notice: {dbError}. Local persistence active.</span>
          </div>
        )}

        {/* 2-Week Pay Summary Hero Card */}
        <PaySummaryCard
          calculation={calculation}
          settings={settings}
          onOpenExport={() => setIsExportOpen(true)}
          activeWeekTab={activeWeekTab}
          onChangeWeekTab={setActiveWeekTab}
        />

        {/* Desktop Navigation Tabs */}
        <div className="hidden sm:flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('timesheet')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                activeTab === 'timesheet'
                  ? 'bg-slate-900 text-white dark:bg-slate-800 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <Calendar className="w-4 h-4 text-sky-500" />
              <span>14-Day Timesheet</span>
            </button>

            <button
              onClick={() => setActiveTab('punch')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                activeTab === 'punch'
                  ? 'bg-slate-900 text-white dark:bg-slate-800 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <Clock className="w-4 h-4 text-emerald-500" />
              <span>Punch Clock</span>
            </button>

            <button
              onClick={() => setActiveTab('timer')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                activeTab === 'timer'
                  ? 'bg-slate-900 text-white dark:bg-slate-800 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <Coffee className="w-4 h-4 text-amber-500" />
              <span>Break &amp; Smoke Timers</span>
            </button>

            <button
              onClick={() => setActiveTab('correction')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                activeTab === 'correction'
                  ? 'bg-slate-900 text-white dark:bg-slate-800 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <Edit3 className="w-4 h-4 text-purple-500" />
              <span>Fix Timecard</span>
            </button>

            <button
              onClick={() => setActiveTab('database')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                activeTab === 'database'
                  ? 'bg-slate-900 text-white dark:bg-slate-800 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <Database className="w-4 h-4 text-indigo-500" />
              <span>SQLite Inspector</span>
            </button>
          </div>

          <button
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80 hover:bg-sky-100 transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Export SMS / Email</span>
          </button>
        </div>

        {/* Tab Views */}
        {activeTab === 'timesheet' && (
          <div className="space-y-6">
            {/* Quick Punch bar on top of timesheet */}
            <PunchClock
              shifts={shifts}
              settings={settings}
              onUpdateShift={handleUpdateShift}
              onSelectTab={(tab) => {
                if (tab === 'export') {
                  setIsExportOpen(true);
                } else {
                  setActiveTab(tab);
                }
              }}
            />

            {/* 14-Day Timesheet Table */}
            <TimesheetView
              shifts={shifts}
              calculation={calculation}
              settings={settings}
              activeWeekTab={activeWeekTab}
              onChangeWeekTab={setActiveWeekTab}
              onUpdateShift={handleUpdateShift}
              onNavigatePeriod={handleNavigatePeriod}
              onChangeStartDate={handleChangeStartDate}
              onRefreshShifts={loadDatabaseData}
            />
          </div>
        )}

        {activeTab === 'punch' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <PunchClock
              shifts={shifts}
              settings={settings}
              onUpdateShift={handleUpdateShift}
              onSelectTab={(tab) => {
                if (tab === 'export') {
                  setIsExportOpen(true);
                } else {
                  setActiveTab(tab);
                }
              }}
            />

            <BreakTimer
              onLogBreakToShift={handleLogBreakToShift}
              defaultSmokeMinutes={settings.defaultSmokeMinutes}
              defaultRestMinutes={settings.defaultRestMinutes}
              defaultLunchMinutes={settings.defaultLunchMinutes}
            />
          </div>
        )}

        {activeTab === 'timer' && (
          <div className="max-w-2xl mx-auto">
            <BreakTimer
              onLogBreakToShift={handleLogBreakToShift}
              defaultSmokeMinutes={settings.defaultSmokeMinutes}
              defaultRestMinutes={settings.defaultRestMinutes}
              defaultLunchMinutes={settings.defaultLunchMinutes}
            />
          </div>
        )}

        {activeTab === 'correction' && (
          <TimeCardCorrection
            settings={settings}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'database' && (
          <DatabaseViewer onDataChanged={loadDatabaseData} />
        )}
      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modals */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        calculation={calculation}
        shifts={shifts}
        settings={settings}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />

      {/* Mobile Navigation Bar */}
      <MobileNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onOpenExport={() => setIsExportOpen(true)}
      />
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Play,
  Square,
  Coffee,
  Cigarette,
  Utensils,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Flame
} from 'lucide-react';
import { ShiftRecord, PayPeriodSettings } from '../types';
import { formatCurrency } from '../utils/calculator';
import { playButtonTapSound, playTimerCompletionChime, playSmokeBreakChime } from '../utils/sound';

interface PunchClockProps {
  shifts: ShiftRecord[];
  settings: PayPeriodSettings;
  onUpdateShift: (shift: ShiftRecord) => void;
  onSelectTab: (tab: 'timesheet' | 'timer' | 'export' | 'database') => void;
}

export const PunchClock: React.FC<PunchClockProps> = ({
  shifts,
  settings,
  onUpdateShift,
  onSelectTab,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const todayStr = new Date().toISOString().split('T')[0];
  const todayShift = shifts.find((s) => s.date === todayStr);

  const symbol = settings.currencySymbol || '$';

  // Live clock tick
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isClockedIn = Boolean(todayShift?.clockIn && !todayShift?.clockOut);
  const isCompletedDay = Boolean(todayShift?.clockIn && todayShift?.clockOut);

  // Calculate live elapsed seconds if clocked in
  let elapsedMinutes = 0;
  if (isClockedIn && todayShift?.clockIn) {
    const [h, m] = todayShift.clockIn.split(':').map(Number);
    const startMinutes = h * 60 + m;
    const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    elapsedMinutes = Math.max(0, nowMinutes - startMinutes - (todayShift.lunchMinutes || 0));
  }

  const liveEarned = (elapsedMinutes / 60) * settings.hourlyRate;

  // Punch actions
  const handleClockIn = () => {
    playButtonTapSound();
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    if (todayShift) {
      onUpdateShift({
        ...todayShift,
        clockIn: timeStr,
        clockOut: '',
        isDayOff: false,
      });
    }
  };

  const handleClockOut = () => {
    playButtonTapSound();
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    if (todayShift) {
      onUpdateShift({
        ...todayShift,
        clockOut: timeStr,
      });
    }
  };

  const handleQuickLunch = () => {
    playButtonTapSound();
    if (todayShift) {
      onUpdateShift({
        ...todayShift,
        lunchMinutes: 30,
      });
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-sm transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left Side: Clock & Status */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                isClockedIn
                  ? 'bg-emerald-500 animate-ping'
                  : isCompletedDay
                  ? 'bg-sky-500'
                  : 'bg-slate-400'
              }`}
            />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isClockedIn
                ? 'Active Shift • Clocked In'
                : isCompletedDay
                ? 'Today Completed'
                : 'Ready To Punch'}
            </span>
          </div>

          <div className="text-4xl sm:text-5xl font-mono font-black text-slate-900 dark:text-white tracking-tight">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            {currentTime.toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>

          {/* Live Earnings meter during active shift */}
          {isClockedIn && (
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/80">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {Math.floor(elapsedMinutes / 60)}h {elapsedMinutes % 60}m elapsed
                </span>
              </div>
              <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/80">
                <DollarSign className="w-3.5 h-3.5" />
                <span>{formatCurrency(liveEarned, symbol)} earned today</span>
              </div>
            </div>
          )}

          {isCompletedDay && todayShift && (
            <div className="pt-1 text-xs text-sky-600 dark:text-sky-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-sky-500" />
              <span>
                Today: In at <strong>{todayShift.clockIn}</strong>, Out at{' '}
                <strong>{todayShift.clockOut}</strong> ({todayShift.lunchMinutes}m lunch)
              </span>
            </div>
          )}
        </div>

        {/* Right Side: Quick Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {!isClockedIn ? (
            <button
              onClick={handleClockIn}
              className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-lg shadow-emerald-600/20 transition active:scale-95"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>CLOCK IN NOW</span>
            </button>
          ) : (
            <button
              onClick={handleClockOut}
              className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm shadow-lg shadow-rose-600/20 transition active:scale-95"
            >
              <Square className="w-5 h-5 fill-white" />
              <span>CLOCK OUT</span>
            </button>
          )}

          {/* Quick Break Presets */}
          <div className="grid grid-cols-3 sm:flex items-center gap-2">
            <button
              onClick={() => onSelectTab('timer')}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 text-slate-700 dark:text-slate-300 transition"
              title="Smoke Break Timer"
            >
              <Cigarette className="w-4 h-4 text-amber-500 mb-1" />
              <span className="text-[11px] font-bold">Smoke</span>
            </button>

            <button
              onClick={() => onSelectTab('timer')}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 text-slate-700 dark:text-slate-300 transition"
              title="15m Rest Break"
            >
              <Coffee className="w-4 h-4 text-sky-500 mb-1" />
              <span className="text-[11px] font-bold">15m Break</span>
            </button>

            <button
              onClick={() => {
                handleQuickLunch();
                onSelectTab('timer');
              }}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 text-slate-700 dark:text-slate-300 transition"
              title="30m Lunch Break"
            >
              <Utensils className="w-4 h-4 text-emerald-500 mb-1" />
              <span className="text-[11px] font-bold">30m Lunch</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

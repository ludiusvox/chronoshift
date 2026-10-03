import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Edit3, CheckCircle, Save, AlertCircle, Sparkles } from 'lucide-react';
import { ShiftRecord, PayPeriodSettings } from '../types';
import { getShiftsForPeriod, updateShift } from '../db/sqlite';
import { calculateShiftWorkedHours, formatCurrency } from '../utils/calculator';
import { playButtonTapSound } from '../utils/sound';

interface TimeCardCorrectionProps {
  settings: PayPeriodSettings;
  onShowToast: (msg: string) => void;
}

export const TimeCardCorrection: React.FC<TimeCardCorrectionProps> = ({ settings, onShowToast }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [targetDate, setTargetDate] = useState<string>(todayStr);
  const [currentShift, setCurrentShift] = useState<ShiftRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const symbol = settings.currencySymbol || '$';

  // Load shift for the selected date
  const loadShiftForDate = async (dateStr: string) => {
    setLoading(true);
    try {
      // Determine period start date containing this date (14-day window)
      const targetTime = new Date(dateStr + 'T00:00:00').getTime();
      const periodStartTime = new Date(settings.periodStartDate + 'T00:00:00').getTime();
      const diffDays = Math.floor((targetTime - periodStartTime) / (1000 * 60 * 60 * 24));

      // Find or load shifts for that period
      // If target date is outside current settings period start, we can compute the appropriate 14-day period start
      let periodStart = settings.periodStartDate;
      if (diffDays < 0 || diffDays >= 14) {
        // Align to Monday of that week
        const d = new Date(dateStr + 'T00:00:00');
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        periodStart = new Date(d.setDate(diff)).toISOString().split('T')[0];
      }

      const shifts = await getShiftsForPeriod(periodStart);
      const found = shifts.find((s) => s.date === dateStr);

      if (found) {
        setCurrentShift({ ...found });
      } else {
        // Create an ad-hoc shift record for this date if not found
        setCurrentShift({
          id: `shift_manual_${dateStr}`,
          timesheetId: `ts_${periodStart}`,
          date: dateStr,
          dayIndex: 0,
          dayName: new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
          clockIn: '08:00',
          clockOut: '17:00',
          lunchMinutes: 30,
          breakMinutes: 0,
          isDayOff: false,
          notes: 'Manually corrected time card entry',
          jobCode: '',
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Failed to load shift for correction:', err);
      onShowToast('Error loading shift for selected date');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShiftForDate(targetDate);
  }, [targetDate]);

  const handleSaveCorrection = async () => {
    if (!currentShift) return;
    playButtonTapSound();
    try {
      await updateShift(currentShift);
      onShowToast(`Successfully updated time card for ${targetDate}!`);
    } catch (err) {
      console.error('Failed to update shift correction:', err);
      onShowToast('Failed to save time card correction');
    }
  };

  const workedHours = currentShift && !currentShift.isDayOff
    ? calculateShiftWorkedHours(currentShift.clockIn, currentShift.clockOut, currentShift.lunchMinutes)
    : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm transition-colors">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Time Card Correction &amp; Fix
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Forgot to clock in or out? Select any date below to review and correct your timesheet.
            </p>
          </div>
        </div>
      </div>

      {/* Date Selector Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <label htmlFor="correction-date" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Date to Fix:
            </label>
            <input
              id="correction-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm font-bold border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTargetDate(todayStr)}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
            >
              Today
            </button>
            <button
              onClick={() => {
                const d = new Date(targetDate + 'T00:00:00');
                d.setDate(d.getDate() - 1);
                setTargetDate(d.toISOString().split('T')[0]);
              }}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
            >
              Previous Day
            </button>
            <button
              onClick={() => {
                const d = new Date(targetDate + 'T00:00:00');
                d.setDate(d.getDate() + 1);
                setTargetDate(d.toISOString().split('T')[0]);
              }}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
            >
              Next Day
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading shift record...</div>
        ) : currentShift ? (
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  {currentShift.dayName}, {currentShift.date}
                </span>
                {targetDate === todayStr && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-sky-500 text-white uppercase">
                    Today
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-sm font-mono font-black text-slate-900 dark:text-white">
                  {workedHours}h worked
                </span>
                <span className="block text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  {formatCurrency(workedHours * settings.hourlyRate, symbol)}
                </span>
              </div>
            </div>

            {/* Shift Correction Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Clock In Time
                </label>
                <input
                  type="time"
                  value={currentShift.clockIn}
                  disabled={currentShift.isDayOff}
                  onChange={(e) => setCurrentShift({ ...currentShift, clockIn: e.target.value, isDayOff: false })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm font-bold disabled:opacity-40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Clock Out Time
                </label>
                <input
                  type="time"
                  value={currentShift.clockOut}
                  disabled={currentShift.isDayOff}
                  onChange={(e) => setCurrentShift({ ...currentShift, clockOut: e.target.value, isDayOff: false })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm font-bold disabled:opacity-40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Unpaid Lunch Deduction
                </label>
                <select
                  value={currentShift.lunchMinutes}
                  disabled={currentShift.isDayOff}
                  onChange={(e) =>
                    setCurrentShift({ ...currentShift, lunchMinutes: parseInt(e.target.value, 10) })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold disabled:opacity-40"
                >
                  <option value={0}>0 minutes (No Lunch)</option>
                  <option value={30}>30 minutes (Standard)</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes (1 Hour)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Job Code / Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Site A, Main Office"
                  value={currentShift.jobCode}
                  onChange={(e) => setCurrentShift({ ...currentShift, jobCode: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Correction Notes / Reason
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Forgot to clock out at end of shift, corrected manually"
                value={currentShift.notes}
                onChange={(e) => setCurrentShift({ ...currentShift, notes: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="correction-day-off"
                  checked={currentShift.isDayOff}
                  onChange={(e) =>
                    setCurrentShift({
                      ...currentShift,
                      isDayOff: e.target.checked,
                      clockIn: e.target.checked ? '' : currentShift.clockIn,
                      clockOut: e.target.checked ? '' : currentShift.clockOut,
                    })
                  }
                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="correction-day-off" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Mark as Day Off / Off Duty
                </label>
              </div>

              <button
                onClick={handleSaveCorrection}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-md transition active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Save Correction</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

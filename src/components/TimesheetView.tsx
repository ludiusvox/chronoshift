import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Coffee,
  Utensils,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Trash2,
  CheckCircle,
  FileText,
  AlertCircle,
  Plus
} from 'lucide-react';
import { ShiftRecord, PayPeriodSettings, BiWeeklyCalculation } from '../types';
import { calculateShiftWorkedHours, formatCurrency } from '../utils/calculator';
import { addShiftForDate, deleteShift } from '../db/sqlite';
import { playButtonTapSound } from '../utils/sound';

interface TimesheetViewProps {
  shifts: ShiftRecord[];
  calculation: BiWeeklyCalculation;
  settings: PayPeriodSettings;
  activeWeekTab: 'all' | 'week1' | 'week2';
  onChangeWeekTab: (tab: 'all' | 'week1' | 'week2') => void;
  onUpdateShift: (shift: ShiftRecord) => void;
  onNavigatePeriod: (direction: 'prev' | 'next' | 'current') => void;
  onChangeStartDate: (newStartDate: string) => void;
  onRefreshShifts: () => void;
}

export const TimesheetView: React.FC<TimesheetViewProps> = ({
  shifts,
  calculation,
  settings,
  activeWeekTab,
  onChangeWeekTab,
  onUpdateShift,
  onNavigatePeriod,
  onChangeStartDate,
  onRefreshShifts,
}) => {
  const [selectedShiftForEdit, setSelectedShiftForEdit] = useState<ShiftRecord | null>(null);
  const todayStr = new Date().toISOString().split('T')[0];
  const symbol = settings.currencySymbol || '$';

  // Determine day indices based on activeWeekTab
  const startDayIdx = activeWeekTab === 'week1' ? 0 : activeWeekTab === 'week2' ? 7 : 0;
  const endDayIdx = activeWeekTab === 'week1' ? 7 : activeWeekTab === 'week2' ? 14 : 14;

  const dayIndices: number[] = [];
  for (let i = startDayIdx; i < endDayIdx; i++) {
    dayIndices.push(i);
  }

  // Helper to get date string for a given dayIndex (0..13) from settings.periodStartDate
  const getDateForDayIndex = (idx: number): string => {
    const base = new Date(settings.periodStartDate + 'T00:00:00');
    base.setDate(base.getDate() + idx);
    return base.toISOString().split('T')[0];
  };

  const getDayNameForDate = (dateStr: string): string => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short' });
  };

  // Handler for quick shift changes
  const handleTimeChange = (shift: ShiftRecord, field: 'clockIn' | 'clockOut', value: string) => {
    const updated = { ...shift, [field]: value, isDayOff: false };
    onUpdateShift(updated);
  };

  const handleLunchChange = (shift: ShiftRecord, minutes: number) => {
    const updated = { ...shift, lunchMinutes: minutes };
    onUpdateShift(updated);
  };

  const handleToggleDayOff = (shift: ShiftRecord) => {
    const updated = {
      ...shift,
      isDayOff: !shift.isDayOff,
      clockIn: !shift.isDayOff ? '' : shift.clockIn,
      clockOut: !shift.isDayOff ? '' : shift.clockOut,
    };
    onUpdateShift(updated);
  };

  const handleAddShiftSession = async (dateStr: string, dayIndex: number) => {
    playButtonTapSound();
    try {
      await addShiftForDate(settings.periodStartDate, dateStr, dayIndex);
      onRefreshShifts();
    } catch (err) {
      console.error('Failed to add shift session:', err);
    }
  };

  const handleDeleteShiftSession = async (shiftId: string) => {
    playButtonTapSound();
    try {
      await deleteShift(shiftId, settings.periodStartDate);
      onRefreshShifts();
    } catch (err) {
      console.error('Failed to delete shift session:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Period Navigation Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs transition-colors">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigatePeriod('prev')}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
            title="Previous 2 Weeks"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigatePeriod('current')}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
          >
            Current Period
          </button>
          <button
            onClick={() => onNavigatePeriod('next')}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
            title="Next 2 Weeks"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Start Date Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="period-start" className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Period Starts:
          </label>
          <input
            id="period-start"
            type="date"
            value={settings.periodStartDate}
            onChange={(e) => {
              if (e.target.value) {
                onChangeStartDate(e.target.value);
              }
            }}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Shifts List Grouped by Day (Supports Multiple Shifts / Split Shifts) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {dayIndices.map((dayIdx) => {
            const dateStr = getDateForDayIndex(dayIdx);
            const dayName = getDayNameForDate(dateStr);
            const isToday = dateStr === todayStr;
            const dayShifts = shifts.filter((s) => s.dayIndex === dayIdx || s.date === dateStr);

            // If no shift exists for this day index yet, create a virtual placeholder or fetch
            const effectiveShifts =
              dayShifts.length > 0
                ? dayShifts
                : [
                    {
                      id: `temp_${dateStr}`,
                      timesheetId: `ts_${settings.periodStartDate}`,
                      date: dateStr,
                      dayIndex: dayIdx,
                      dayName,
                      clockIn: '',
                      clockOut: '',
                      lunchMinutes: 0,
                      breakMinutes: 0,
                      isDayOff: true,
                      notes: '',
                      jobCode: '',
                      updatedAt: new Date().toISOString(),
                    },
                  ];

            return (
              <div
                key={`day_${dayIdx}_${dateStr}`}
                className={`p-3.5 sm:px-5 sm:py-4 transition-colors ${
                  isToday ? 'bg-sky-50/40 dark:bg-sky-950/20' : ''
                }`}
              >
                {/* Day Header & Add Shift Button */}
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center font-black text-xs shrink-0 ${
                        isToday
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold leading-none">{dayName}</span>
                      <span className="leading-none mt-0.5">{dateStr.split('-')[2]}</span>
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{dayName}</span>
                        <span className="text-xs text-slate-500 font-normal">{dateStr}</span>
                        {isToday && (
                          <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-sky-500 text-white uppercase tracking-wider">
                            Today
                          </span>
                        )}
                        {effectiveShifts.length > 1 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            {effectiveShifts.length} Shifts (Split)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Add Split Shift Button */}
                  <button
                    onClick={() => handleAddShiftSession(dateStr, dayIdx)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 hover:bg-sky-100 border border-sky-200 dark:border-sky-800 transition shadow-xs"
                    title="Add another shift session for this day (Split Shift)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Shift</span>
                  </button>
                </div>

                {/* Shift Sessions List for this Day */}
                <div className="space-y-2.5 pt-1">
                  {effectiveShifts.map((shift, sIdx) => {
                    const worked = shift.isDayOff
                      ? 0
                      : calculateShiftWorkedHours(shift.clockIn, shift.clockOut, shift.lunchMinutes);

                    return (
                      <div
                        key={shift.id}
                        className={`p-3 rounded-xl border transition ${
                          shift.isDayOff
                            ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-80'
                            : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 shadow-2xs'
                        }`}
                      >
                        {/* Desktop / Tablet Row per Shift */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-sm">
                          {/* Shift Label */}
                          <div className="md:col-span-2 flex items-center gap-2">
                            <span className="text-xs font-ext500 text-slate-500 dark:text-slate-400">
                              Shift #{sIdx + 1}
                            </span>
                            {shift.isDayOff && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                OFF
                              </span>
                            )}
                          </div>

                          {/* Clock In */}
                          <div className="md:col-span-2">
                            <label className="block text-[10px] text-slate-400 md:hidden mb-0.5">Clock In:</label>
                            <input
                              type="time"
                              value={shift.clockIn}
                              disabled={shift.isDayOff}
                              onChange={(e) => handleTimeChange(shift, 'clockIn', e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs font-semibold text-slate-900 dark:text-white disabled:opacity-40"
                            />
                          </div>

                          {/* Clock Out */}
                          <div className="md:col-span-2">
                            <label className="block text-[10px] text-slate-400 md:hidden mb-0.5">Clock Out:</label>
                            <input
                              type="time"
                              value={shift.clockOut}
                              disabled={shift.isDayOff}
                              onChange={(e) => handleTimeChange(shift, 'clockOut', e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs font-semibold text-slate-900 dark:text-white disabled:opacity-40"
                            />
                          </div>

                          {/* Lunch */}
                          <div className="md:col-span-2">
                            <label className="block text-[10px] text-slate-400 md:hidden mb-0.5">Lunch:</label>
                            <select
                              value={shift.lunchMinutes}
                              disabled={shift.isDayOff}
                              onChange={(e) => handleLunchChange(shift, parseInt(e.target.value, 10))}
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white disabled:opacity-40"
                            >
                              <option value={0}>0m Lunch</option>
                              <option value={30}>30m Lunch</option>
                              <option value={45}>45m Lunch</option>
                              <option value={60}>60m Lunch</option>
                            </select>
                          </div>

                          {/* Worked / Pay */}
                          <div className="md:col-span-2 text-right">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center justify-end gap-1.5">
                              <span className="font-mono text-sm">{worked}h</span>
                            </div>
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              {formatCurrency(worked * settings.hourlyRate, symbol)}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="md:col-span-2 flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleToggleDayOff(shift)}
                              className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${
                                shift.isDayOff
                                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {shift.isDayOff ? 'OFF' : 'Work'}
                            </button>
                            <button
                              onClick={() => setSelectedShiftForEdit(shift)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              title="Edit Notes & Job Code"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            {effectiveShifts.length > 1 && !shift.id.startsWith('temp_') && (
                              <button
                                onClick={() => handleDeleteShiftSession(shift.id)}
                                className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                                title="Delete this shift session"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {shift.notes && (
                          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 px-2.5 py-1 rounded-lg">
                            Note: {shift.notes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Shift Modal (Notes & Job Codes) */}
      {selectedShiftForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Edit Shift Details
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedShiftForEdit.dayName}, {selectedShiftForEdit.date}
                </p>
              </div>
              <button
                onClick={() => setSelectedShiftForEdit(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Clock In
                  </label>
                  <input
                    type="time"
                    value={selectedShiftForEdit.clockIn}
                    onChange={(e) =>
                      setSelectedShiftForEdit({ ...selectedShiftForEdit, clockIn: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Clock Out
                  </label>
                  <input
                    type="time"
                    value={selectedShiftForEdit.clockOut}
                    onChange={(e) =>
                      setSelectedShiftForEdit({ ...selectedShiftForEdit, clockOut: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Unpaid Lunch Deduction (minutes)
                </label>
                <select
                  value={selectedShiftForEdit.lunchMinutes}
                  onChange={(e) =>
                    setSelectedShiftForEdit({
                      ...selectedShiftForEdit,
                      lunchMinutes: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value={0}>0 minutes (No lunch break)</option>
                  <option value={30}>30 minutes (Standard Lunch)</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes (1 Hour Lunch)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Job Code / Project / Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Site A, Maintenance, Warehouse"
                  value={selectedShiftForEdit.jobCode}
                  onChange={(e) =>
                    setSelectedShiftForEdit({ ...selectedShiftForEdit, jobCode: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Shift Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Split shift morning/evening session"
                  value={selectedShiftForEdit.notes}
                  onChange={(e) =>
                    setSelectedShiftForEdit({ ...selectedShiftForEdit, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setSelectedShiftForEdit(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onUpdateShift(selectedShiftForEdit);
                  setSelectedShiftForEdit(null);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-xs transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

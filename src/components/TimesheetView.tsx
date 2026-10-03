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
  AlertCircle
} from 'lucide-react';
import { ShiftRecord, PayPeriodSettings, BiWeeklyCalculation } from '../types';
import { calculateShiftWorkedHours, formatCurrency } from '../utils/calculator';

interface TimesheetViewProps {
  shifts: ShiftRecord[];
  calculation: BiWeeklyCalculation;
  settings: PayPeriodSettings;
  activeWeekTab: 'all' | 'week1' | 'week2';
  onChangeWeekTab: (tab: 'all' | 'week1' | 'week2') => void;
  onUpdateShift: (shift: ShiftRecord) => void;
  onNavigatePeriod: (direction: 'prev' | 'next' | 'current') => void;
  onChangeStartDate: (newStartDate: string) => void;
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
}) => {
  const [selectedShiftForEdit, setSelectedShiftForEdit] = useState<ShiftRecord | null>(null);
  const todayStr = new Date().toISOString().split('T')[0];
  const symbol = settings.currencySymbol || '$';

  // Filter shifts based on activeWeekTab
  const displayedShifts =
    activeWeekTab === 'week1'
      ? shifts.slice(0, 7)
      : activeWeekTab === 'week2'
      ? shifts.slice(7, 14)
      : shifts;

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

  const handleAutoFillWeekdays = (weekNum: 1 | 2) => {
    const startIndex = weekNum === 1 ? 0 : 7;
    const endIndex = weekNum === 1 ? 7 : 14;

    for (let i = startIndex; i < endIndex; i++) {
      const shift = shifts[i];
      const [y, m, d] = shift.date.split('-').map(Number);
      const dayOfWeek = new Date(y, m - 1, d).getDay(); // 0 is Sun, 6 is Sat

      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        onUpdateShift({
          ...shift,
          clockIn: '08:00',
          clockOut: '16:30',
          lunchMinutes: 30,
          isDayOff: false,
        });
      } else {
        onUpdateShift({
          ...shift,
          clockIn: '',
          clockOut: '',
          lunchMinutes: 0,
          isDayOff: true,
        });
      }
    }
  };

  const handleClearWeek = (weekNum: 1 | 2) => {
    const startIndex = weekNum === 1 ? 0 : 7;
    const endIndex = weekNum === 1 ? 7 : 14;
    for (let i = startIndex; i < endIndex; i++) {
      const shift = shifts[i];
      onUpdateShift({
        ...shift,
        clockIn: '',
        clockOut: '',
        lunchMinutes: 0,
        isDayOff: true,
      });
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

        {/* Quick Batch Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleAutoFillWeekdays(activeWeekTab === 'week2' ? 2 : 1)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 hover:bg-sky-100 border border-sky-200 dark:border-sky-800 transition"
            title="Auto fill 8h workdays (8:00 AM - 4:30 PM with 30m lunch)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Fill Standard Mon-Fri</span>
          </button>
        </div>
      </div>

      {/* Shifts List / Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        {/* Table Header for Desktop */}
        <div className="hidden lg:grid grid-cols-12 gap-3 px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <div className="col-span-3">Day &amp; Date</div>
          <div className="col-span-2">Clock In</div>
          <div className="col-span-2">Clock Out</div>
          <div className="col-span-2">30m Lunch</div>
          <div className="col-span-2 text-right">Worked / Pay</div>
          <div className="col-span-1 text-center">Actions</div>
        </div>

        {/* Shift Items */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {displayedShifts.map((shift, idx) => {
            const isToday = shift.date === todayStr;
            const isW1 = shift.dayIndex < 7;
            const weekIdx = isW1 ? shift.dayIndex : shift.dayIndex - 7;
            const dayCalc = isW1
              ? calculation.week1.dailyBreakdown[weekIdx]
              : calculation.week2.dailyBreakdown[weekIdx];

            const worked = shift.isDayOff
              ? 0
              : calculateShiftWorkedHours(shift.clockIn, shift.clockOut, shift.lunchMinutes);
            const isOvertimeHour = dayCalc && dayCalc.overtimeHours > 0;

            return (
              <div
                key={shift.id}
                className={`p-3.5 sm:px-5 sm:py-4 transition-colors ${
                  isToday
                    ? 'bg-sky-50/50 dark:bg-sky-950/20'
                    : shift.isDayOff
                    ? 'bg-slate-50/60 dark:bg-slate-900/40 opacity-75'
                    : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                }`}
              >
                {/* Desktop View Row */}
                <div className="hidden lg:grid grid-cols-12 gap-3 items-center text-sm">
                  {/* Date & Day */}
                  <div className="col-span-3 flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center font-black text-xs shrink-0 ${
                        isToday
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold leading-none">{shift.dayName}</span>
                      <span className="leading-none mt-0.5">{shift.date.split('-')[2]}</span>
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{shift.dayName}</span>
                        <span className="text-xs text-slate-500 font-normal">
                          {shift.date}
                        </span>
                        {isToday && (
                          <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-sky-500 text-white uppercase tracking-wider">
                            Today
                          </span>
                        )}
                        {shift.isDayOff && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            OFF
                          </span>
                        )}
                      </div>
                      {shift.notes && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                          Note: {shift.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Clock In */}
                  <div className="col-span-2">
                    <input
                      type="time"
                      value={shift.clockIn}
                      disabled={shift.isDayOff}
                      onChange={(e) => handleTimeChange(shift, 'clockIn', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs font-semibold text-slate-900 dark:text-white disabled:opacity-40"
                    />
                  </div>

                  {/* Clock Out */}
                  <div className="col-span-2">
                    <input
                      type="time"
                      value={shift.clockOut}
                      disabled={shift.isDayOff}
                      onChange={(e) => handleTimeChange(shift, 'clockOut', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs font-semibold text-slate-900 dark:text-white disabled:opacity-40"
                    />
                  </div>

                  {/* 30m Lunch */}
                  <div className="col-span-2 flex items-center gap-1.5">
                    <select
                      value={shift.lunchMinutes}
                      disabled={shift.isDayOff}
                      onChange={(e) => handleLunchChange(shift, parseInt(e.target.value, 10))}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white disabled:opacity-40"
                    >
                      <option value={0}>No Lunch (0m)</option>
                      <option value={30}>30 min Lunch</option>
                      <option value={45}>45 min Lunch</option>
                      <option value={60}>60 min Lunch</option>
                    </select>
                  </div>

                  {/* Worked / Pay */}
                  <div className="col-span-2 text-right">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center justify-end gap-1.5">
                      <span className="font-mono text-base">{worked}h</span>
                      {isOvertimeHour && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          +{dayCalc?.overtimeHours}h OT
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                      {formatCurrency(worked * settings.hourlyRate, symbol)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex items-center justify-center gap-1">
                    <button
                      onClick={() => handleToggleDayOff(shift)}
                      className={`p-1.5 rounded-lg text-xs font-semibold transition ${
                        shift.isDayOff
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title={shift.isDayOff ? 'Mark as Working Day' : 'Mark as Day Off'}
                    >
                      OFF
                    </button>
                    <button
                      onClick={() => setSelectedShiftForEdit(shift)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Add Notes or details"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Mobile View Card */}
                <div className="block lg:hidden space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center font-bold text-xs shrink-0 ${
                          isToday
                            ? 'bg-sky-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="text-[10px] uppercase font-bold">{shift.dayName}</span>
                        <span className="leading-none">{shift.date.split('-')[2]}</span>
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{shift.dayName}</span>
                          <span className="text-xs text-slate-500 font-normal">
                            {shift.date}
                          </span>
                          {isToday && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500 text-white uppercase">
                              Today
                            </span>
                          )}
                        </div>
                        {shift.isDayOff ? (
                          <span className="text-xs font-semibold text-slate-400">Day Off</span>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            {worked}h worked &bull; {formatCurrency(worked * settings.hourlyRate, symbol)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleDayOff(shift)}
                        className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                          shift.isDayOff
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {shift.isDayOff ? 'Day Off' : 'Work'}
                      </button>
                      <button
                        onClick={() => setSelectedShiftForEdit(shift)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {!shift.isDayOff && (
                    <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                      <div>
                        <span className="block text-[10px] text-slate-400 font-medium mb-0.5">In:</span>
                        <input
                          type="time"
                          value={shift.clockIn}
                          onChange={(e) => handleTimeChange(shift, 'clockIn', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs font-bold"
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-medium mb-0.5">Out:</span>
                        <input
                          type="time"
                          value={shift.clockOut}
                          onChange={(e) => handleTimeChange(shift, 'clockOut', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs font-bold"
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-medium mb-0.5">Lunch:</span>
                        <select
                          value={shift.lunchMinutes}
                          onChange={(e) => handleLunchChange(shift, parseInt(e.target.value, 10))}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                        >
                          <option value={0}>0m</option>
                          <option value={30}>30m</option>
                          <option value={45}>45m</option>
                          <option value={60}>60m</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {shift.notes && (
                    <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                      Note: {shift.notes}
                    </div>
                  )}
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
                  placeholder="e.g. Covered shift for Sarah, worked extra hour for inventory"
                  value={selectedShiftForEdit.notes}
                  onChange={(e) =>
                    setSelectedShiftForEdit({ ...selectedShiftForEdit, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="modal-day-off"
                  checked={selectedShiftForEdit.isDayOff}
                  onChange={(e) =>
                    setSelectedShiftForEdit({ ...selectedShiftForEdit, isDayOff: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="modal-day-off" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Mark this day as Off (Vacation / Sick / Weekend)
                </label>
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

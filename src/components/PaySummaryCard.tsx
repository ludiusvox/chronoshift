import React from 'react';
import { DollarSign, Clock, Zap, TrendingUp, Calendar, ChevronRight } from 'lucide-react';
import { BiWeeklyCalculation, PayPeriodSettings } from '../types';
import { formatCurrency, formatHoursMinutes } from '../utils/calculator';

interface PaySummaryCardProps {
  calculation: BiWeeklyCalculation;
  settings: PayPeriodSettings;
  onOpenExport: () => void;
  activeWeekTab: 'all' | 'week1' | 'week2';
  onChangeWeekTab: (tab: 'all' | 'week1' | 'week2') => void;
}

export const PaySummaryCard: React.FC<PaySummaryCardProps> = ({
  calculation,
  settings,
  onOpenExport,
  activeWeekTab,
  onChangeWeekTab,
}) => {
  const symbol = settings.currencySymbol || '$';
  const hasOvertime = calculation.totalOvertimeHours > 0;
  const otRate = calculation.hourlyRate * settings.overtimeMultiplier;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-5 sm:p-7 shadow-xl shadow-slate-950/20 border border-slate-700/60 transition-all">
      {/* Top Bar: Pay Period Range & Quick Switch */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-sky-400" />
          <span className="text-xs sm:text-sm font-semibold text-slate-300">
            2-Week Pay Period: <strong className="text-white">{calculation.periodStartDate}</strong> to{' '}
            <strong className="text-white">{calculation.periodEndDate}</strong>
          </span>
        </div>

        <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
          <button
            onClick={() => onChangeWeekTab('all')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
              activeWeekTab === 'all'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All 14 Days
          </button>
          <button
            onClick={() => onChangeWeekTab('week1')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
              activeWeekTab === 'week1'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Week 1
          </button>
          <button
            onClick={() => onChangeWeekTab('week2')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
              activeWeekTab === 'week2'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Week 2
          </button>
        </div>
      </div>

      {/* Main Figures: Gross Pay & Total Hours */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center my-6">
        {/* Left: Total Gross Earnings */}
        <div className="md:col-span-5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-400 font-bold">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>2-Week Gross Earnings</span>
          </div>
          <div className="text-3xl sm:text-5xl font-black tracking-tight text-white flex items-baseline gap-2">
            <span>{formatCurrency(calculation.grossPay, symbol)}</span>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            Rate: <span className="font-semibold text-emerald-400">{formatCurrency(calculation.hourlyRate, symbol)}/hr</span>
            {hasOvertime && (
              <>
                <span className="text-slate-600">&bull;</span>
                OT Rate: <span className="font-semibold text-amber-400">{formatCurrency(otRate, symbol)}/hr (1.5x)</span>
              </>
            )}
          </p>
        </div>

        {/* Right: Hours breakdown cards */}
        <div className="md:col-span-7 grid grid-cols-3 gap-2 sm:gap-3">
          {/* Total Hours */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 sm:p-4">
            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400 mb-1">
              <Clock className="w-3 h-3 text-sky-400" />
              <span>Total Hours</span>
            </div>
            <div className="text-lg sm:text-2xl font-black text-white">
              {calculation.totalWorkedHours}
              <span className="text-xs font-normal text-slate-400 ml-0.5">h</span>
            </div>
            <div className="text-[10px] text-slate-400">
              {formatHoursMinutes(calculation.totalWorkedHours)}
            </div>
          </div>

          {/* Regular Hours */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 sm:p-4">
            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400 mb-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span>Regular</span>
            </div>
            <div className="text-lg sm:text-2xl font-black text-emerald-400">
              {calculation.totalRegularHours}
              <span className="text-xs font-normal text-slate-400 ml-0.5">h</span>
            </div>
            <div className="text-[10px] text-slate-300 font-medium">
              {formatCurrency(calculation.totalRegularPay, symbol)}
            </div>
          </div>

          {/* Overtime Hours */}
          <div className={`border rounded-2xl p-3 sm:p-4 transition-all ${
            hasOvertime
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
              : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
          }`}>
            <div className="flex items-center gap-1 text-[11px] font-medium mb-1">
              <Zap className={`w-3 h-3 ${hasOvertime ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}`} />
              <span className={hasOvertime ? 'text-amber-300 font-bold' : 'text-slate-400'}>
                Overtime 1.5x
              </span>
            </div>
            <div className={`text-lg sm:text-2xl font-black ${hasOvertime ? 'text-amber-400' : 'text-slate-400'}`}>
              {calculation.totalOvertimeHours}
              <span className="text-xs font-normal text-slate-400 ml-0.5">h</span>
            </div>
            <div className={`text-[10px] font-medium ${hasOvertime ? 'text-amber-300' : 'text-slate-500'}`}>
              {formatCurrency(calculation.totalOvertimePay, symbol)}
            </div>
          </div>
        </div>
      </div>

      {/* Week 1 vs Week 2 Comparison Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-700/60 text-xs">
        {/* Week 1 pill */}
        <div
          onClick={() => onChangeWeekTab('week1')}
          className={`cursor-pointer p-3 rounded-xl border transition flex items-center justify-between ${
            activeWeekTab === 'week1'
              ? 'bg-sky-500/20 border-sky-400/60 text-white'
              : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80 text-slate-300'
          }`}
        >
          <div>
            <div className="font-bold flex items-center gap-1.5 text-white">
              <span>Week 1</span>
              <span className="text-[11px] text-slate-400 font-normal">
                ({calculation.week1.startDate.slice(5)} - {calculation.week1.endDate.slice(5)})
              </span>
            </div>
            <div className="text-slate-400 text-[11px] mt-0.5">
              Worked: <strong className="text-white">{calculation.week1.totalWorkedHours}h</strong> &bull; Reg: {calculation.week1.regularHours}h &bull; OT: <strong className={calculation.week1.overtimeHours > 0 ? 'text-amber-400' : 'text-slate-400'}>{calculation.week1.overtimeHours}h</strong>
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-sm text-emerald-400">
              {formatCurrency(calculation.week1.totalPay, symbol)}
            </div>
            <div className="text-[10px] text-slate-400 flex items-center justify-end">
              View Week <ChevronRight className="w-3 h-3 ml-0.5" />
            </div>
          </div>
        </div>

        {/* Week 2 pill */}
        <div
          onClick={() => onChangeWeekTab('week2')}
          className={`cursor-pointer p-3 rounded-xl border transition flex items-center justify-between ${
            activeWeekTab === 'week2'
              ? 'bg-sky-500/20 border-sky-400/60 text-white'
              : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80 text-slate-300'
          }`}
        >
          <div>
            <div className="font-bold flex items-center gap-1.5 text-white">
              <span>Week 2</span>
              <span className="text-[11px] text-slate-400 font-normal">
                ({calculation.week2.startDate.slice(5)} - {calculation.week2.endDate.slice(5)})
              </span>
            </div>
            <div className="text-slate-400 text-[11px] mt-0.5">
              Worked: <strong className="text-white">{calculation.week2.totalWorkedHours}h</strong> &bull; Reg: {calculation.week2.regularHours}h &bull; OT: <strong className={calculation.week2.overtimeHours > 0 ? 'text-amber-400' : 'text-slate-400'}>{calculation.week2.overtimeHours}h</strong>
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-sm text-emerald-400">
              {formatCurrency(calculation.week2.totalPay, symbol)}
            </div>
            <div className="text-[10px] text-slate-400 flex items-center justify-end">
              View Week <ChevronRight className="w-3 h-3 ml-0.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

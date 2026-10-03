import React, { useState } from 'react';
import { X, Settings, DollarSign, Clock, ShieldCheck, Save, Check } from 'lucide-react';
import { PayPeriodSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PayPeriodSettings;
  onSaveSettings: (settings: PayPeriodSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [form, setForm] = useState<PayPeriodSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(form);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold">
              <Settings className="w-5 h-5 text-sky-500" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Timesheet &amp; Payroll Settings
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Rate of pay, overtime rules, and break preferences
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto grow space-y-5 text-sm">
          {/* Rate of Pay */}
          <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Rate of Pay ($ / Hour)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">$</span>
              <input
                type="number"
                step="0.25"
                min="0"
                required
                value={form.hourlyRate}
                onChange={(e) => setForm({ ...form, hourlyRate: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl text-base font-bold border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400">
              Used to calculate standard earnings and 1.5x overtime for hours over 40.
            </p>
          </div>

          {/* Overtime Policy */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Overtime Rules (FLSA)
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Weekly OT Threshold
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={form.overtimeThresholdWeekly}
                    onChange={(e) =>
                      setForm({ ...form, overtimeThresholdWeekly: parseInt(e.target.value, 10) || 40 })
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <span className="text-xs text-slate-500 font-medium">hrs</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  OT Pay Multiplier
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="3"
                    value={form.overtimeMultiplier}
                    onChange={(e) =>
                      setForm({ ...form, overtimeMultiplier: parseFloat(e.target.value) || 1.5 })
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <span className="text-xs text-slate-500 font-medium">x</span>
                </div>
              </div>
            </div>

            {/* Daily OT toggle */}
            <div className="pt-1 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Daily Overtime (&gt; 8 hrs/day)
                </span>
                <span className="text-[11px] text-slate-500">
                  Calculates OT for single shifts exceeding 8 hours (California / special contracts)
                </span>
              </div>
              <input
                type="checkbox"
                checked={form.enableDailyOvertime}
                onChange={(e) => setForm({ ...form, enableDailyOvertime: e.target.checked })}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Break Presets */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Default Break Timers
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Smoke Break
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={form.defaultSmokeMinutes}
                  onChange={(e) =>
                    setForm({ ...form, defaultSmokeMinutes: parseInt(e.target.value, 10) || 7 })
                  }
                  className="w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-center"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Rest Break
                </label>
                <input
                  type="number"
                  min="5"
                  max="45"
                  value={form.defaultRestMinutes}
                  onChange={(e) =>
                    setForm({ ...form, defaultRestMinutes: parseInt(e.target.value, 10) || 15 })
                  }
                  className="w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-center"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Lunch Break
                </label>
                <input
                  type="number"
                  min="10"
                  max="90"
                  value={form.defaultLunchMinutes}
                  onChange={(e) =>
                    setForm({ ...form, defaultLunchMinutes: parseInt(e.target.value, 10) || 30 })
                  }
                  className="w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-center"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-xs transition active:scale-95"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

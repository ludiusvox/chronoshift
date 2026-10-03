import React, { useState } from 'react';
import {
  X,
  MessageSquare,
  Mail,
  FileSpreadsheet,
  Copy,
  Check,
  ExternalLink,
  Download,
  Share2,
  Smartphone
} from 'lucide-react';
import { BiWeeklyCalculation, ShiftRecord, PayPeriodSettings } from '../types';
import {
  generateTextMessageExport,
  generateEmailExport,
  generateCsvExport,
  copyToClipboard,
} from '../utils/exporter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  calculation: BiWeeklyCalculation;
  shifts: ShiftRecord[];
  settings: PayPeriodSettings;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  calculation,
  shifts,
  settings,
}) => {
  const [activeTab, setActiveTab] = useState<'sms' | 'email' | 'csv'>('sms');
  const [employeeName, setEmployeeName] = useState<string>(() => {
    return localStorage.getItem('chronoshift_employee_name') || '';
  });
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleNameChange = (name: string) => {
    setEmployeeName(name);
    localStorage.setItem('chronoshift_employee_name', name);
  };

  const smsText = generateTextMessageExport(calculation, shifts, settings, employeeName);
  const emailData = generateEmailExport(calculation, shifts, settings, employeeName);
  const csvText = generateCsvExport(calculation, shifts, settings, employeeName);

  const handleCopy = async (text: string, type: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  const handleOpenSmsApp = () => {
    // Encodes for SMS URL
    const url = `sms:?body=${encodeURIComponent(smsText)}`;
    window.location.href = url;
  };

  const handleOpenEmailApp = () => {
    const url = `mailto:?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(
      emailData.body
    )}`;
    window.location.href = url;
  };

  const handleDownloadCsv = () => {
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `timesheet_${calculation.periodStartDate}_to_${calculation.periodEndDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Export &amp; Share Timesheet
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Copy to clipboard for text messages, emails, or spreadsheets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Employee Name Input */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 shrink-0">
          <label htmlFor="employee-name-input" className="text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0">
            Employee Name:
          </label>
          <input
            id="employee-name-input"
            type="text"
            placeholder="e.g. John Doe (Optional)"
            value={employeeName}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-sky-500"
          />
        </div>

        {/* Tabs: Text Message vs Email vs CSV */}
        <div className="px-4 sm:px-6 pt-3 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('sms')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition ${
              activeTab === 'sms'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Text Message (SMS)</span>
          </button>

          <button
            onClick={() => setActiveTab('email')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition ${
              activeTab === 'email'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Email Format</span>
          </button>

          <button
            onClick={() => setActiveTab('csv')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition ${
              activeTab === 'csv'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>CSV / Excel</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto grow space-y-4">
          {/* SMS Tab */}
          {activeTab === 'sms' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Formatted for SMS, WhatsApp, and iMessage:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(smsText, 'sms')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-xs transition active:scale-95"
                  >
                    {copiedType === 'sms' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy for Text Message</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleOpenSmsApp}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title="Open SMS app directly"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Open Messages</span>
                  </button>
                </div>
              </div>

              {/* Text Preview Box */}
              <div className="relative">
                <pre className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto border border-slate-800 shadow-inner">
                  {smsText}
                </pre>
              </div>
            </div>
          )}

          {/* Email Tab */}
          {activeTab === 'email' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Formatted submission with table and payroll calculation:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(emailData.body, 'email')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-xs transition active:scale-95"
                  >
                    {copiedType === 'email' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy for Email</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleOpenEmailApp}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title="Open default email client"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-sky-500" />
                    <span>Open Email App</span>
                  </button>
                </div>
              </div>

              {/* Subject preview */}
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                <span className="font-semibold text-slate-500 dark:text-slate-400 mr-2">Subject:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{emailData.subject}</span>
              </div>

              {/* Email Body preview */}
              <div className="relative">
                <pre className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto border border-slate-800 shadow-inner">
                  {emailData.body}
                </pre>
              </div>
            </div>
          )}

          {/* CSV Tab */}
          {activeTab === 'csv' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Standard CSV format for Excel, Google Sheets, or Payroll import:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(csvText, 'csv')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    {copiedType === 'csv' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy CSV</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownloadCsv}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .CSV File</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <pre className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs whitespace-pre leading-relaxed max-h-72 overflow-x-auto overflow-y-auto border border-slate-800 shadow-inner">
                  {csvText}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <span className="text-xs text-slate-500">
            Tip: Overtime is calculated at 1.5x for hours over 40 per workweek.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

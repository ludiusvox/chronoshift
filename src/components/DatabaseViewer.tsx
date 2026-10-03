import React, { useState, useEffect } from 'react';
import {
  Database,
  Play,
  Download,
  Upload,
  RefreshCw,
  Table,
  CheckCircle2,
  AlertTriangle,
  Code2
} from 'lucide-react';
import {
  executeRawQuery,
  exportSqliteFile,
  importSqliteFile,
  getDatabase
} from '../db/sqlite';

interface DatabaseViewerProps {
  onDataChanged?: () => void;
}

export const DatabaseViewer: React.FC<DatabaseViewerProps> = ({ onDataChanged }) => {
  const [selectedTable, setSelectedTable] = useState<string>('shifts');
  const [tableData, setTableData] = useState<{ columns: string[]; values: any[][] }>({
    columns: [],
    values: [],
  });
  const [customSql, setCustomSql] = useState<string>('SELECT * FROM shifts LIMIT 14;');
  const [queryResult, setQueryResult] = useState<{ columns: string[]; values: any[][] } | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const tables = ['shifts', 'timesheets', 'break_events', 'settings', 'punch_history'];

  const loadTable = async (tableName: string) => {
    setSelectedTable(tableName);
    try {
      const res = await executeRawQuery(`SELECT * FROM ${tableName} LIMIT 50;`);
      setTableData(res);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadTable(selectedTable);
  }, []);

  const handleRunQuery = async () => {
    if (!customSql.trim()) return;
    setIsExecuting(true);
    setQueryError(null);
    try {
      const res = await executeRawQuery(customSql);
      setQueryResult(res);
      if (
        customSql.toUpperCase().includes('UPDATE') ||
        customSql.toUpperCase().includes('INSERT') ||
        customSql.toUpperCase().includes('DELETE')
      ) {
        if (onDataChanged) onDataChanged();
        loadTable(selectedTable);
      }
    } catch (err: any) {
      setQueryError(err.message || 'Error executing query');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExportSqlite = async () => {
    try {
      const blob = await exportSqliteFile();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chronoshift_${new Date().toISOString().split('T')[0]}.sqlite`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export SQLite database:', err);
    }
  };

  const handleImportSqlite = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImportStatus('Importing SQLite file...');
      await importSqliteFile(file);
      setImportStatus('Database successfully restored!');
      loadTable(selectedTable);
      if (onDataChanged) onDataChanged();
      setTimeout(() => setImportStatus(null), 3000);
    } catch (err: any) {
      setImportStatus(`Import failed: ${err.message || 'Invalid SQLite file'}`);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-6 transition-colors">
      {/* Header with Title and Backup buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Embedded SQLite Database</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 font-mono">
                sql.js WASM Active
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Relational SQLite engine &bull; Local IndexedDB binary persistence &bull; SQL query runner
            </p>
          </div>
        </div>

        {/* Database actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportSqlite}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition active:scale-95"
            title="Download raw SQLite .sqlite binary file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export .sqlite</span>
          </button>

          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer transition">
            <Upload className="w-3.5 h-3.5 text-sky-500" />
            <span>Restore .sqlite</span>
            <input
              type="file"
              accept=".sqlite,.db,.sqlite3"
              onChange={handleImportSqlite}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {importStatus && (
        <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-300 dark:border-sky-800 text-xs font-semibold text-sky-700 dark:text-sky-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{importStatus}</span>
        </div>
      )}

      {/* SQL Query Runner Console */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-1.5">
            <Code2 className="w-4 h-4 text-indigo-500" />
            <span>SQL Query Runner</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCustomSql('SELECT * FROM shifts ORDER BY date ASC;')}
              className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline"
            >
              Presets: All Shifts
            </button>
            <span className="text-slate-400">&bull;</span>
            <button
              onClick={() => setCustomSql('SELECT * FROM settings;')}
              className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline"
            >
              Settings
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={customSql}
            onChange={(e) => setCustomSql(e.target.value)}
            placeholder="e.g. SELECT * FROM shifts WHERE lunch_minutes > 0;"
            className="grow px-3 py-2 rounded-xl text-xs font-mono border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={handleRunQuery}
            disabled={isExecuting}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition active:scale-95 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Run SQL</span>
          </button>
        </div>

        {queryError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{queryError}</span>
          </div>
        )}

        {/* Query Results View */}
        {queryResult && (
          <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto max-h-56">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <tr>
                  {queryResult.columns.map((col, i) => (
                    <th key={i} className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {queryResult.values.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-1.5 text-slate-700 dark:text-slate-300">
                        {cell === null ? <span className="text-slate-400">NULL</span> : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Table Browser */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Table className="w-4 h-4 text-sky-500" />
            <span>Table Browser</span>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {tables.map((t) => (
              <button
                key={t}
                onClick={() => loadTable(t)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition ${
                  selectedTable === t
                    ? 'bg-slate-900 text-white dark:bg-sky-500'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Table Grid */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto max-h-72">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold sticky top-0">
              <tr>
                {tableData.columns.map((col, i) => (
                  <th key={i} className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-700 font-mono">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono">
              {tableData.values.length === 0 ? (
                <tr>
                  <td colSpan={tableData.columns.length || 1} className="px-4 py-6 text-center text-slate-400">
                    No records found in {selectedTable}
                  </td>
                </tr>
              ) : (
                tableData.values.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    {row.map((val, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-slate-700 dark:text-slate-300 truncate max-w-xs">
                        {val === null ? <span className="text-slate-400">NULL</span> : String(val)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

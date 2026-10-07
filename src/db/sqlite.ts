/**
 * Embedded SQLite Database System for ChronoShift.
 * Powered by sql.js (WebAssembly SQLite) with automated IndexedDB persistence,
 * schema migrations, SQL query execution, and .sqlite file import/export.
 */

import initSqlJs, { Database } from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { ShiftRecord, PayPeriodSettings, BreakLog } from '../types';

const DB_STORE_NAME = 'chronoshift_sqlite_blob';
const DB_KEY = 'sqlite_db_binary';
const DB_VERSION = 1;

let dbInstance: Database | null = null;
let isInitializing = false;
let initPromise: Promise<Database> | null = null;

// IndexedDB Helper to persist the SQLite binary array
async function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ChronoShiftDB', DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE_NAME)) {
        db.createObjectStore(DB_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadSavedDatabaseBlob(): Promise<Uint8Array | null> {
  try {
    const idb = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(DB_STORE_NAME, 'readonly');
      const store = tx.objectStore(DB_STORE_NAME);
      const req = store.get(DB_KEY);
      req.onsuccess = () => {
        if (req.result && req.result instanceof Uint8Array) {
          resolve(req.result);
        } else if (req.result && req.result.buffer) {
          resolve(new Uint8Array(req.result.buffer));
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not read from IndexedDB, starting fresh SQLite DB:', err);
    return null;
  }
}

export async function saveDatabaseToDisk(): Promise<void> {
  if (!dbInstance) return;
  try {
    const binary = dbInstance.export();
    const idb = await openIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(DB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(DB_STORE_NAME);
      const req = store.put(binary, DB_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to save SQLite binary to IndexedDB:', err);
  }
}

const INITIAL_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS timesheets (
  id TEXT PRIMARY KEY,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  timesheet_id TEXT NOT NULL,
  date TEXT NOT NULL,
  day_index INTEGER NOT NULL,
  clock_in TEXT,
  clock_out TEXT,
  lunch_minutes INTEGER DEFAULT 0,
  break_minutes INTEGER DEFAULT 0,
  is_day_off INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  job_code TEXT DEFAULT '',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS break_events (
  id TEXT PRIMARY KEY,
  shift_date TEXT NOT NULL,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  is_deducted INTEGER DEFAULT 0,
  started_at TEXT NOT NULL,
  ended_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS punch_history (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  type TEXT NOT NULL,
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts (date);
CREATE INDEX IF NOT EXISTS idx_shifts_timesheet ON shifts (timesheet_id);
`;

export async function getDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    isInitializing = true;
    try {
      const SQL = await initSqlJs({
        locateFile: () => sqlWasmUrl,
      });

      const savedBlob = await loadSavedDatabaseBlob();
      let db: Database;
      if (savedBlob && savedBlob.length > 0) {
        db = new SQL.Database(savedBlob);
      } else {
        db = new SQL.Database();
      }

      // Run initial migrations
      db.run(INITIAL_SCHEMA_SQL);

      dbInstance = db;
      await saveDatabaseToDisk();
      return db;
    } finally {
      isInitializing = false;
    }
  })();

  return initPromise;
}

// Settings methods
export async function getSettings(): Promise<PayPeriodSettings> {
  const db = await getDatabase();
  const defaultSettings: PayPeriodSettings = {
    hourlyRate: 25.0,
    periodStartDate: getInitialStartDate(),
    overtimeThresholdWeekly: 40,
    overtimeMultiplier: 1.5,
    defaultLunchMinutes: 30,
    defaultSmokeMinutes: 7,
    defaultRestMinutes: 15,
    currencySymbol: '$',
    enableDailyOvertime: false,
    dailyOvertimeThreshold: 8,
  };

  try {
    const res = db.exec("SELECT key, value FROM settings");
    if (res.length > 0 && res[0].values) {
      const map: Record<string, string> = {};
      for (const row of res[0].values) {
        map[String(row[0])] = String(row[1]);
      }

      return {
        hourlyRate: map['hourlyRate'] ? parseFloat(map['hourlyRate']) : defaultSettings.hourlyRate,
        periodStartDate: map['periodStartDate'] || defaultSettings.periodStartDate,
        overtimeThresholdWeekly: map['overtimeThresholdWeekly'] ? parseFloat(map['overtimeThresholdWeekly']) : 40,
        overtimeMultiplier: map['overtimeMultiplier'] ? parseFloat(map['overtimeMultiplier']) : 1.5,
        defaultLunchMinutes: map['defaultLunchMinutes'] ? parseInt(map['defaultLunchMinutes'], 10) : 30,
        defaultSmokeMinutes: map['defaultSmokeMinutes'] ? parseInt(map['defaultSmokeMinutes'], 10) : 7,
        defaultRestMinutes: map['defaultRestMinutes'] ? parseInt(map['defaultRestMinutes'], 10) : 15,
        currencySymbol: map['currencySymbol'] || '$',
        enableDailyOvertime: map['enableDailyOvertime'] === 'true',
        dailyOvertimeThreshold: map['dailyOvertimeThreshold'] ? parseFloat(map['dailyOvertimeThreshold']) : 8,
      };
    }
  } catch (err) {
    console.error('Error fetching settings:', err);
  }

  // Seed default settings into sqlite
  await updateSettings(defaultSettings);
  return defaultSettings;
}

export async function updateSettings(settings: PayPeriodSettings): Promise<void> {
  const db = await getDatabase();
  const entries = Object.entries(settings);
  db.run("BEGIN TRANSACTION");
  for (const [key, val] of entries) {
    db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, String(val)]);
  }
  db.run("COMMIT");
  await saveDatabaseToDisk();
}

// Shifts methods for a 2-week period
export async function getShiftsForPeriod(startDate: string): Promise<ShiftRecord[]> {
  const db = await getDatabase();
  const timesheetId = `ts_${startDate}`;

  // Check if shifts exist
  const res = db.exec("SELECT id, timesheet_id, date, day_index, clock_in, clock_out, lunch_minutes, break_minutes, is_day_off, notes, job_code, updated_at FROM shifts WHERE timesheet_id = ? ORDER BY day_index ASC, updated_at ASC", [timesheetId]);

  if (res.length > 0 && res[0].values.length > 0) {
    return res[0].values.map((row) => {
      const date = String(row[2]);
      return {
        id: String(row[0]),
        timesheetId: String(row[1]),
        date,
        dayIndex: Number(row[3]),
        dayName: getDayName(date),
        clockIn: row[4] ? String(row[4]) : '',
        clockOut: row[5] ? String(row[5]) : '',
        lunchMinutes: Number(row[6]) || 0,
        breakMinutes: Number(row[7]) || 0,
        isDayOff: Number(row[8]) === 1,
        notes: row[9] ? String(row[9]) : '',
        jobCode: row[10] ? String(row[10]) : '',
        updatedAt: String(row[11]),
      };
    });
  }

  // Otherwise generate 14 days initialized for this pay period
  return await initialize14DayPeriod(startDate);
}

export async function addShiftForDate(startDate: string, dateStr: string, dayIndex: number): Promise<ShiftRecord[]> {
  const db = await getDatabase();
  const timesheetId = `ts_${startDate}`;
  const shiftId = `shift_${timesheetId}_${dateStr}_${Date.now()}`;

  db.run(
    "INSERT INTO shifts (id, timesheet_id, date, day_index, clock_in, clock_out, lunch_minutes, break_minutes, is_day_off, notes, job_code, updated_at) VALUES (?, ?, ?, ?, '', '', 0, 0, 0, '', '', ?)",
    [shiftId, timesheetId, dateStr, dayIndex, new Date().toISOString()]
  );
  await saveDatabaseToDisk();
  return await getShiftsForPeriod(startDate);
}

export async function deleteShift(shiftId: string, startDate: string): Promise<ShiftRecord[]> {
  const db = await getDatabase();
  db.run("DELETE FROM shifts WHERE id = ?", [shiftId]);
  await saveDatabaseToDisk();
  return await getShiftsForPeriod(startDate);
}

export async function initialize14DayPeriod(startDateStr: string): Promise<ShiftRecord[]> {
  const db = await getDatabase();
  const timesheetId = `ts_${startDateStr}`;
  const startDate = new Date(startDateStr + 'T00:00:00');
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 13);
  const endDateStr = endDate.toISOString().split('T')[0];

  db.run("INSERT OR REPLACE INTO timesheets (id, start_date, end_date, status, created_at) VALUES (?, ?, ?, 'active', ?)", [
    timesheetId,
    startDateStr,
    endDateStr,
    new Date().toISOString(),
  ]);

  const shifts: ShiftRecord[] = [];
  db.run("BEGIN TRANSACTION");

  for (let i = 0; i < 14; i++) {
    const curDate = new Date(startDate);
    curDate.setDate(curDate.getDate() + i);
    const dateStr = curDate.toISOString().split('T')[0];
    const shiftId = `shift_${timesheetId}_${i}`;
    const dayOfWeek = curDate.getDay(); // 0 is Sun, 6 is Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Check if shift already in DB
    const existing = db.exec("SELECT id, clock_in, clock_out, lunch_minutes, break_minutes, is_day_off, notes, job_code FROM shifts WHERE id = ?", [shiftId]);

    let clockIn = '';
    let clockOut = '';
    let lunchMinutes = 0;
    let breakMinutes = 0;
    let isDayOff = isWeekend;
    let notes = '';
    let jobCode = '';

    if (existing.length > 0 && existing[0].values.length > 0) {
      const row = existing[0].values[0];
      clockIn = row[1] ? String(row[1]) : '';
      clockOut = row[2] ? String(row[2]) : '';
      lunchMinutes = Number(row[3]) || 0;
      breakMinutes = Number(row[4]) || 0;
      isDayOff = Number(row[5]) === 1;
      notes = row[6] ? String(row[6]) : '';
      jobCode = row[7] ? String(row[7]) : '';
    } else {
      db.run(
        "INSERT INTO shifts (id, timesheet_id, date, day_index, clock_in, clock_out, lunch_minutes, break_minutes, is_day_off, notes, job_code, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          shiftId,
          timesheetId,
          dateStr,
          i,
          clockIn,
          clockOut,
          lunchMinutes,
          breakMinutes,
          isDayOff ? 1 : 0,
          notes,
          jobCode,
          new Date().toISOString(),
        ]
      );
    }

    shifts.push({
      id: shiftId,
      timesheetId,
      date: dateStr,
      dayIndex: i,
      dayName: getDayName(dateStr),
      clockIn,
      clockOut,
      lunchMinutes,
      breakMinutes,
      isDayOff,
      notes,
      jobCode,
      updatedAt: new Date().toISOString(),
    });
  }

  db.run("COMMIT");
  await saveDatabaseToDisk();
  return shifts;
}

export async function updateShift(shift: ShiftRecord): Promise<void> {
  const db = await getDatabase();
  db.run(
    "UPDATE shifts SET clock_in = ?, clock_out = ?, lunch_minutes = ?, break_minutes = ?, is_day_off = ?, notes = ?, job_code = ?, updated_at = ? WHERE id = ?",
    [
      shift.clockIn,
      shift.clockOut,
      shift.lunchMinutes,
      shift.breakMinutes,
      shift.isDayOff ? 1 : 0,
      shift.notes,
      shift.jobCode,
      new Date().toISOString(),
      shift.id,
    ]
  );
  await saveDatabaseToDisk();
}

export async function logBreakEvent(event: Omit<BreakLog, 'id'>): Promise<string> {
  const db = await getDatabase();
  const id = `break_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  db.run(
    "INSERT INTO break_events (id, shift_date, type, label, duration_minutes, is_deducted, started_at, ended_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      id,
      event.shiftDate,
      event.type,
      event.label,
      event.durationMinutes,
      event.isDeducted ? 1 : 0,
      event.startedAt,
      event.endedAt,
    ]
  );
  await saveDatabaseToDisk();
  return id;
}

export async function getBreakEventsForDate(dateStr: string): Promise<BreakLog[]> {
  const db = await getDatabase();
  const res = db.exec("SELECT id, shift_date, type, label, duration_minutes, is_deducted, started_at, ended_at FROM break_events WHERE shift_date = ? ORDER BY started_at DESC", [dateStr]);
  if (res.length > 0 && res[0].values) {
    return res[0].values.map((row) => ({
      id: String(row[0]),
      shiftDate: String(row[1]),
      type: row[2] as BreakLog['type'],
      label: String(row[3]),
      durationMinutes: Number(row[4]),
      isDeducted: Number(row[5]) === 1,
      startedAt: String(row[6]),
      endedAt: String(row[7]),
    }));
  }
  return [];
}

// SQL Query Runner for SQLite Database Inspector
export async function executeRawQuery(sql: string): Promise<{ columns: string[]; values: any[][] }> {
  const db = await getDatabase();
  const trimmed = sql.trim();
  const res = db.exec(trimmed);
  if (trimmed.toUpperCase().startsWith('INSERT') ||
      trimmed.toUpperCase().startsWith('UPDATE') ||
      trimmed.toUpperCase().startsWith('DELETE') ||
      trimmed.toUpperCase().startsWith('CREATE') ||
      trimmed.toUpperCase().startsWith('DROP') ||
      trimmed.toUpperCase().startsWith('ALTER')) {
    await saveDatabaseToDisk();
  }
  if (res.length > 0) {
    return {
      columns: res[0].columns,
      values: res[0].values,
    };
  }
  return { columns: [], values: [] };
}

// Export SQLite database as binary download
export async function exportSqliteFile(): Promise<Blob> {
  const db = await getDatabase();
  const binary = db.export();
  return new Blob([binary.buffer as ArrayBuffer], { type: 'application/x-sqlite3' });
}

// Import SQLite binary file from user upload
export async function importSqliteFile(file: File): Promise<void> {
  const buffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(buffer);
  const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl });
  const newDb = new SQL.Database(uint8);
  dbInstance = newDb;
  await saveDatabaseToDisk();
}

// Helper: initial start date = the most recent Monday (or current week's start)
function getInitialStartDate(): string {
  const now = new Date();
  const day = now.getDay();
  // We align to Monday: day 1 is Monday, day 0 is Sunday
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

function getDayName(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

export type BreakType = 'smoke' | 'rest' | 'lunch' | 'custom';

export interface ShiftRecord {
  id: string;
  timesheetId: string;
  date: string; // YYYY-MM-DD
  dayIndex: number; // 0 to 13
  dayName: string; // 'Monday', 'Tuesday', etc.
  clockIn: string; // '08:00' or ''
  clockOut: string; // '16:30' or ''
  lunchMinutes: number; // typically 30 min (unpaid deduction)
  breakMinutes: number; // rest/smoke breaks tracked (paid)
  isDayOff: boolean;
  notes: string;
  jobCode: string;
  updatedAt: string;
}

export interface BreakLog {
  id: string;
  shiftDate: string;
  type: BreakType;
  label: string;
  durationMinutes: number;
  isDeducted: boolean;
  startedAt: string;
  endedAt: string;
}

export interface PunchRecord {
  id: string;
  timestamp: string;
  type: 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
  note?: string;
}

export interface PayPeriodSettings {
  hourlyRate: number;
  periodStartDate: string; // YYYY-MM-DD (start of 2-week block)
  overtimeThresholdWeekly: number; // default 40
  overtimeMultiplier: number; // default 1.5
  defaultLunchMinutes: number; // default 30
  defaultSmokeMinutes: number; // default 7
  defaultRestMinutes: number; // default 15
  currencySymbol: string; // default '$'
  enableDailyOvertime: boolean; // over 8 hrs/day (California etc.)
  dailyOvertimeThreshold: number; // 8
}

export interface WeekCalculation {
  weekNumber: 1 | 2;
  startDate: string;
  endDate: string;
  totalWorkedHours: number;
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  totalPay: number;
  dailyBreakdown: {
    date: string;
    dayName: string;
    clockIn: string;
    clockOut: string;
    lunchMinutes: number;
    workedHours: number;
    regularHours: number;
    overtimeHours: number;
  }[];
}

export interface BiWeeklyCalculation {
  periodStartDate: string;
  periodEndDate: string;
  hourlyRate: number;
  week1: WeekCalculation;
  week2: WeekCalculation;
  totalWorkedHours: number;
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalRegularPay: number;
  totalOvertimePay: number;
  grossPay: number;
}

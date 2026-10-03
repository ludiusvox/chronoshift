import { ShiftRecord, PayPeriodSettings, BiWeeklyCalculation, WeekCalculation } from '../types';

/**
 * Calculates duration between two time strings (HH:MM), accounting for overnight shifts.
 * Returns hours as decimal (e.g. 8.5).
 */
export function calculateShiftWorkedHours(
  clockIn: string,
  clockOut: string,
  lunchMinutes: number = 0
): number {
  if (!clockIn || !clockOut) return 0;

  const [inH, inM] = clockIn.split(':').map(Number);
  const [outH, outM] = clockOut.split(':').map(Number);

  if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) return 0;

  let startMinutes = inH * 60 + inM;
  let endMinutes = outH * 60 + outM;

  // Handle overnight shift (e.g. 22:00 to 06:00)
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  let totalMinutes = endMinutes - startMinutes;

  // Deduct unpaid lunch minutes
  if (lunchMinutes > 0) {
    totalMinutes = Math.max(0, totalMinutes - lunchMinutes);
  }

  return Math.round((totalMinutes / 60) * 100) / 100;
}

/**
 * Converts decimal hours to "Xh Ym" string (e.g. 8.5 -> "8h 30m").
 */
export function formatHoursMinutes(hours: number): string {
  if (hours <= 0) return '0h 00m';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m < 10 ? '0' : ''}${m}m`;
}

/**
 * Formats currency amount (e.g. 1250.5 -> "$1,250.50")
 */
export function formatCurrency(amount: number, symbol: string = '$'): string {
  return `${symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Calculates complete Bi-Weekly timesheet metrics with Overtime 1.5x over 40 hours per workweek.
 */
export function calculateBiWeeklyPay(
  shifts: ShiftRecord[],
  settings: PayPeriodSettings
): BiWeeklyCalculation {
  const rate = settings.hourlyRate || 0;
  const otThreshold = settings.overtimeThresholdWeekly || 40;
  const otMultiplier = settings.overtimeMultiplier || 1.5;

  // Split into Week 1 (indices 0..6) and Week 2 (indices 7..13)
  const week1Shifts = shifts.slice(0, 7);
  const week2Shifts = shifts.slice(7, 14);

  function calculateSingleWeek(weekShifts: ShiftRecord[], weekNum: 1 | 2): WeekCalculation {
    let weekTotalWorked = 0;

    const dailyBreakdown = weekShifts.map((shift) => {
      const worked = shift.isDayOff
        ? 0
        : calculateShiftWorkedHours(shift.clockIn, shift.clockOut, shift.lunchMinutes);
      weekTotalWorked += worked;

      return {
        date: shift.date,
        dayName: shift.dayName,
        clockIn: shift.clockIn,
        clockOut: shift.clockOut,
        lunchMinutes: shift.lunchMinutes,
        workedHours: worked,
        regularHours: 0, // computed below
        overtimeHours: 0, // computed below
      };
    });

    weekTotalWorked = Math.round(weekTotalWorked * 100) / 100;

    let regularHours = 0;
    let overtimeHours = 0;

    if (settings.enableDailyOvertime) {
      // Daily Overtime rule (e.g. >8h in a single day is OT, plus weekly >40h)
      const dailyThreshold = settings.dailyOvertimeThreshold || 8;
      dailyBreakdown.forEach((day) => {
        if (day.workedHours > dailyThreshold) {
          day.regularHours = dailyThreshold;
          day.overtimeHours = day.workedHours - dailyThreshold;
        } else {
          day.regularHours = day.workedHours;
          day.overtimeHours = 0;
        }
        regularHours += day.regularHours;
        overtimeHours += day.overtimeHours;
      });

      // Also check if cumulative regular hours exceed weekly threshold
      if (regularHours > otThreshold) {
        const extraOt = regularHours - otThreshold;
        overtimeHours += extraOt;
        regularHours = otThreshold;
      }
    } else {
      // Standard FLSA: 1.5x for hours over 40 in the workweek
      if (weekTotalWorked > otThreshold) {
        regularHours = otThreshold;
        overtimeHours = weekTotalWorked - otThreshold;
      } else {
        regularHours = weekTotalWorked;
        overtimeHours = 0;
      }

      // Distribute to dailyBreakdown for display
      let runningTotal = 0;
      dailyBreakdown.forEach((day) => {
        const priorTotal = runningTotal;
        runningTotal += day.workedHours;

        if (priorTotal >= otThreshold) {
          day.regularHours = 0;
          day.overtimeHours = day.workedHours;
        } else if (runningTotal > otThreshold) {
          day.regularHours = Math.round((otThreshold - priorTotal) * 100) / 100;
          day.overtimeHours = Math.round((day.workedHours - day.regularHours) * 100) / 100;
        } else {
          day.regularHours = day.workedHours;
          day.overtimeHours = 0;
        }
      });
    }

    regularHours = Math.round(regularHours * 100) / 100;
    overtimeHours = Math.round(overtimeHours * 100) / 100;

    const regularPay = Math.round(regularHours * rate * 100) / 100;
    const overtimePay = Math.round(overtimeHours * (rate * otMultiplier) * 100) / 100;
    const totalPay = Math.round((regularPay + overtimePay) * 100) / 100;

    return {
      weekNumber: weekNum,
      startDate: weekShifts[0]?.date || '',
      endDate: weekShifts[weekShifts.length - 1]?.date || '',
      totalWorkedHours: weekTotalWorked,
      regularHours,
      overtimeHours,
      regularPay,
      overtimePay,
      totalPay,
      dailyBreakdown,
    };
  }

  const week1 = calculateSingleWeek(week1Shifts, 1);
  const week2 = calculateSingleWeek(week2Shifts, 2);

  const totalWorkedHours = Math.round((week1.totalWorkedHours + week2.totalWorkedHours) * 100) / 100;
  const totalRegularHours = Math.round((week1.regularHours + week2.regularHours) * 100) / 100;
  const totalOvertimeHours = Math.round((week1.overtimeHours + week2.overtimeHours) * 100) / 100;
  const totalRegularPay = Math.round((week1.regularPay + week2.regularPay) * 100) / 100;
  const totalOvertimePay = Math.round((week1.overtimePay + week2.overtimePay) * 100) / 100;
  const grossPay = Math.round((totalRegularPay + totalOvertimePay) * 100) / 100;

  return {
    periodStartDate: shifts[0]?.date || '',
    periodEndDate: shifts[shifts.length - 1]?.date || '',
    hourlyRate: rate,
    week1,
    week2,
    totalWorkedHours,
    totalRegularHours,
    totalOvertimeHours,
    totalRegularPay,
    totalOvertimePay,
    grossPay,
  };
}

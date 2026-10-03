import { BiWeeklyCalculation, ShiftRecord, PayPeriodSettings } from '../types';
import { formatCurrency, formatHoursMinutes } from './calculator';

export function generateTextMessageExport(
  calc: BiWeeklyCalculation,
  shifts: ShiftRecord[],
  settings: PayPeriodSettings,
  employeeName: string = ''
): string {
  const symbol = settings.currencySymbol || '$';
  const nameLine = employeeName.trim() ? `👤 ${employeeName.trim()}\n` : '';

  let text = `⏱️ TIMESHEET REPORT (2 WEEKS)\n`;
  if (nameLine) text += nameLine;
  text += `📅 Period: ${calc.periodStartDate} to ${calc.periodEndDate}\n`;
  text += `💵 Rate: ${formatCurrency(calc.hourlyRate, symbol)}/hr (OT 1.5x: ${formatCurrency(calc.hourlyRate * settings.overtimeMultiplier, symbol)}/hr)\n`;
  text += `------------------------------\n`;

  // Week 1
  text += `📌 WEEK 1 (${calc.week1.startDate} to ${calc.week1.endDate})\n`;
  shifts.slice(0, 7).forEach((s) => {
    if (s.isDayOff || (!s.clockIn && !s.clockOut)) {
      text += `  • ${s.dayName} (${s.date.slice(5)}): OFF\n`;
    } else {
      text += `  • ${s.dayName} (${s.date.slice(5)}): ${s.clockIn} - ${s.clockOut} (${s.lunchMinutes}m lunch)\n`;
    }
  });
  text += `  👉 W1 Total: ${calc.week1.totalWorkedHours} hrs (Reg: ${calc.week1.regularHours}h | OT: ${calc.week1.overtimeHours}h)\n`;
  text += `  💰 W1 Pay: ${formatCurrency(calc.week1.totalPay, symbol)}\n\n`;

  // Week 2
  text += `📌 WEEK 2 (${calc.week2.startDate} to ${calc.week2.endDate})\n`;
  shifts.slice(7, 14).forEach((s) => {
    if (s.isDayOff || (!s.clockIn && !s.clockOut)) {
      text += `  • ${s.dayName} (${s.date.slice(5)}): OFF\n`;
    } else {
      text += `  • ${s.dayName} (${s.date.slice(5)}): ${s.clockIn} - ${s.clockOut} (${s.lunchMinutes}m lunch)\n`;
    }
  });
  text += `  👉 W2 Total: ${calc.week2.totalWorkedHours} hrs (Reg: ${calc.week2.regularHours}h | OT: ${calc.week2.overtimeHours}h)\n`;
  text += `  💰 W2 Pay: ${formatCurrency(calc.week2.totalPay, symbol)}\n`;

  text += `------------------------------\n`;
  text += `📊 BI-WEEKLY TOTALS:\n`;
  text += `• Total Hours: ${calc.totalWorkedHours} hrs\n`;
  text += `• Regular Hours: ${calc.totalRegularHours} hrs (${formatCurrency(calc.totalRegularPay, symbol)})\n`;
  text += `• Overtime (1.5x): ${calc.totalOvertimeHours} hrs (${formatCurrency(calc.totalOvertimePay, symbol)})\n`;
  text += `⭐ TOTAL GROSS PAY: ${formatCurrency(calc.grossPay, symbol)}\n`;

  return text;
}

export function generateEmailExport(
  calc: BiWeeklyCalculation,
  shifts: ShiftRecord[],
  settings: PayPeriodSettings,
  employeeName: string = ''
): { subject: string; body: string } {
  const symbol = settings.currencySymbol || '$';
  const nameStr = employeeName.trim() || 'Employee';
  const subject = `Timesheet Submission - ${nameStr} (${calc.periodStartDate} to ${calc.periodEndDate})`;

  let body = `Hello,\n\nPlease find my bi-weekly timesheet submission for the pay period ${calc.periodStartDate} to ${calc.periodEndDate}.\n\n`;

  body += `EMPLOYEE DETAILS & RATES\n`;
  body += `========================================================\n`;
  if (employeeName.trim()) body += `Employee Name: ${employeeName.trim()}\n`;
  body += `Pay Period:    ${calc.periodStartDate} to ${calc.periodEndDate} (14 days)\n`;
  body += `Base Pay Rate: ${formatCurrency(calc.hourlyRate, symbol)} / hour\n`;
  body += `Overtime Rate: ${formatCurrency(calc.hourlyRate * settings.overtimeMultiplier, symbol)} / hour (1.5x over 40 hrs/week)\n\n`;

  body += `WEEK 1 BREAKDOWN (${calc.week1.startDate} to ${calc.week1.endDate})\n`;
  body += `--------------------------------------------------------\n`;
  body += `Date        Day   In      Out     Lunch   Worked   Reg    OT     Notes\n`;
  body += `--------------------------------------------------------\n`;
  calc.week1.dailyBreakdown.forEach((day, idx) => {
    const shift = shifts[idx];
    const inStr = day.clockIn ? day.clockIn.padEnd(6) : '--    ';
    const outStr = day.clockOut ? day.clockOut.padEnd(6) : '--    ';
    const lunchStr = `${day.lunchMinutes}m`.padEnd(7);
    const workedStr = shift.isDayOff ? 'OFF   ' : `${day.workedHours}h`.padEnd(8);
    const regStr = `${day.regularHours}h`.padEnd(6);
    const otStr = `${day.overtimeHours}h`.padEnd(6);
    const notesStr = shift.notes ? `[${shift.notes}]` : '';

    body += `${day.date}  ${day.dayName.padEnd(4)}  ${inStr}  ${outStr}  ${lunchStr} ${workedStr} ${regStr} ${otStr} ${notesStr}\n`;
  });
  body += `--------------------------------------------------------\n`;
  body += `Week 1 Subtotal: ${calc.week1.totalWorkedHours} hrs | Reg: ${calc.week1.regularHours}h (${formatCurrency(calc.week1.regularPay, symbol)}) | OT: ${calc.week1.overtimeHours}h (${formatCurrency(calc.week1.overtimePay, symbol)}) | Pay: ${formatCurrency(calc.week1.totalPay, symbol)}\n\n`;

  body += `WEEK 2 BREAKDOWN (${calc.week2.startDate} to ${calc.week2.endDate})\n`;
  body += `--------------------------------------------------------\n`;
  body += `Date        Day   In      Out     Lunch   Worked   Reg    OT     Notes\n`;
  body += `--------------------------------------------------------\n`;
  calc.week2.dailyBreakdown.forEach((day, idx) => {
    const shift = shifts[idx + 7];
    const inStr = day.clockIn ? day.clockIn.padEnd(6) : '--    ';
    const outStr = day.clockOut ? day.clockOut.padEnd(6) : '--    ';
    const lunchStr = `${day.lunchMinutes}m`.padEnd(7);
    const workedStr = shift.isDayOff ? 'OFF   ' : `${day.workedHours}h`.padEnd(8);
    const regStr = `${day.regularHours}h`.padEnd(6);
    const otStr = `${day.overtimeHours}h`.padEnd(6);
    const notesStr = shift.notes ? `[${shift.notes}]` : '';

    body += `${day.date}  ${day.dayName.padEnd(4)}  ${inStr}  ${outStr}  ${lunchStr} ${workedStr} ${regStr} ${otStr} ${notesStr}\n`;
  });
  body += `--------------------------------------------------------\n`;
  body += `Week 2 Subtotal: ${calc.week2.totalWorkedHours} hrs | Reg: ${calc.week2.regularHours}h (${formatCurrency(calc.week2.regularPay, symbol)}) | OT: ${calc.week2.overtimeHours}h (${formatCurrency(calc.week2.overtimePay, symbol)}) | Pay: ${formatCurrency(calc.week2.totalPay, symbol)}\n\n`;

  body += `========================================================\n`;
  body += `BI-WEEKLY PAYROLL SUMMARY\n`;
  body += `========================================================\n`;
  body += `Total Hours Worked:   ${calc.totalWorkedHours} hours\n`;
  body += `Regular Hours:        ${calc.totalRegularHours} hours @ ${formatCurrency(calc.hourlyRate, symbol)} = ${formatCurrency(calc.totalRegularPay, symbol)}\n`;
  body += `Overtime Hours (1.5x): ${calc.totalOvertimeHours} hours @ ${formatCurrency(calc.hourlyRate * settings.overtimeMultiplier, symbol)} = ${formatCurrency(calc.totalOvertimePay, symbol)}\n`;
  body += `--------------------------------------------------------\n`;
  body += `TOTAL GROSS EARNINGS: ${formatCurrency(calc.grossPay, symbol)}\n`;
  body += `========================================================\n\n`;
  body += `Generated via ChronoShift Timesheet.\n`;

  return { subject, body };
}

export function generateCsvExport(
  calc: BiWeeklyCalculation,
  shifts: ShiftRecord[],
  settings: PayPeriodSettings,
  employeeName: string = ''
): string {
  const lines: string[] = [];
  lines.push(`"Employee","${employeeName.replace(/"/g, '""')}"`);
  lines.push(`"Pay Period","${calc.periodStartDate} to ${calc.periodEndDate}"`);
  lines.push(`"Base Rate","${calc.hourlyRate}"`);
  lines.push(`"Overtime Multiplier","${settings.overtimeMultiplier}"`);
  lines.push('');
  lines.push(`"Week","Date","Day","Clock In","Clock Out","Lunch (mins)","Break (mins)","Day Off","Worked Hours","Regular Hours","Overtime Hours","Notes","Job Code"`);

  shifts.forEach((s) => {
    const isW1 = s.dayIndex < 7;
    const weekNum = isW1 ? 1 : 2;
    const dayBreakdown = isW1
      ? calc.week1.dailyBreakdown[s.dayIndex]
      : calc.week2.dailyBreakdown[s.dayIndex - 7];

    lines.push(
      [
        `Week ${weekNum}`,
        `"${s.date}"`,
        `"${s.dayName}"`,
        `"${s.clockIn}"`,
        `"${s.clockOut}"`,
        s.lunchMinutes,
        s.breakMinutes,
        s.isDayOff ? 'Yes' : 'No',
        dayBreakdown?.workedHours || 0,
        dayBreakdown?.regularHours || 0,
        dayBreakdown?.overtimeHours || 0,
        `"${(s.notes || '').replace(/"/g, '""')}"`,
        `"${(s.jobCode || '').replace(/"/g, '""')}"`,
      ].join(',')
    );
  });

  lines.push('');
  lines.push(`"Summary","Hours","Rate","Pay"`);
  lines.push(`"Regular",${calc.totalRegularHours},${calc.hourlyRate},${calc.totalRegularPay}`);
  lines.push(`"Overtime",${calc.totalOvertimeHours},${calc.hourlyRate * settings.overtimeMultiplier},${calc.totalOvertimePay}`);
  lines.push(`"Total Gross",${calc.totalWorkedHours},,${calc.grossPay}`);

  return lines.join('\n');
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback
    }
  }

  // Fallback for older browsers or if permissions blocked
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    textarea.style.top = '-999999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const success = document.execCommand('copy');
    textarea.remove();
    return success;
  } catch {
    return false;
  }
}

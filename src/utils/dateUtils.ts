/**
 * Date utility functions for HeadsUp / Still
 */

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentTimeString(): string {
  const d = new Date();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatWidgetDate(date: Date = new Date()): string {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const dayName = days[date.getDay()];
  const monthName = months[date.getMonth()];
  const dayNum = date.getDate();
  return `${dayName}, ${monthName} ${dayNum}`;
}

export function getWeekNumber(d: Date = new Date()): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function formatHeaderDate(date: Date = new Date()): { dateText: string; weekText: string } {
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
  const dateText = date.toLocaleDateString('en-US', options);
  const weekText = `Week ${getWeekNumber(date)}`;
  return { dateText, weekText };
}

export function formatDueTime(timeStr: string | null): string {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12; // 0 becomes 12
  return `${h}:${m} ${ampm}`;
}

export function getRelativeTimeRemaining(dueDateStr: string, dueTimeStr: string | null): string {
  const today = getTodayDateString();
  const now = new Date();
  
  if (dueDateStr === today) {
    if (!dueTimeStr) {
      return 'Today';
    }
    const [h, m] = dueTimeStr.split(':').map(Number);
    const target = new Date();
    target.setHours(h, m, 0, 0);
    const diffMs = target.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      const pastMins = Math.floor(Math.abs(diffMs) / (1000 * 60));
      if (pastMins < 60) return `due ${pastMins}m ago`;
      const pastHours = (pastMins / 60).toFixed(1).replace('.0', '');
      return `due ${pastHours}h ago`;
    }
    
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 60) {
      return `in ${diffMins}m`;
    }
    const diffHours = (diffMins / 60).toFixed(1).replace('.0', '');
    return `in ${diffHours}h`;
  }
  
  // Future dates
  const targetDate = new Date(`${dueDateStr}T00:00:00`);
  const todayDate = new Date(`${today}T00:00:00`);
  const dayDiff = Math.round((targetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (dayDiff === 1) return 'Tomorrow';
  if (dayDiff > 1 && dayDiff <= 7) return `in ${dayDiff}d`;
  if (dayDiff < 0) {
    const overdueDays = Math.abs(dayDiff);
    return `Overdue by ${overdueDays} ${overdueDays === 1 ? 'day' : 'days'}`;
  }
  
  return dueDateStr;
}

export function isTaskOverdue(dueDateStr: string, dueTimeStr: string | null): boolean {
  const today = getTodayDateString();
  if (dueDateStr < today) return true;
  if (dueDateStr === today && dueTimeStr) {
    const currentTime = getCurrentTimeString();
    return dueTimeStr < currentTime;
  }
  return false;
}

export function calculateNextOccurrence(dueDateStr: string, recurrence: 'none' | 'daily' | 'weekly' | 'monthly'): string {
  const date = new Date(`${dueDateStr}T00:00:00`);
  if (recurrence === 'daily') {
    date.setDate(date.getDate() + 1);
  } else if (recurrence === 'weekly') {
    date.setDate(date.getDate() + 7);
  } else if (recurrence === 'monthly') {
    date.setMonth(date.getMonth() + 1);
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

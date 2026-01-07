import { DateTime } from 'luxon';

interface ScheduleConfig {
    days: number[]; // 1 = Monday, 7 = Sunday
    start: string;  // "09:00"
    end: string;    // "17:00"
    timezone: string; // "America/New_York"
}

export function isInSendingWindow(schedule: ScheduleConfig): boolean {
    if (!schedule || !schedule.timezone) return true; // Default to always send if no schedule

    const now = DateTime.now().setZone(schedule.timezone);

    // Check Day (Luxon: 1 is Mon, 7 is Sun)
    if (!schedule.days.includes(now.weekday)) {
        return false;
    }

    // Check Time
    const startTime = DateTime.fromFormat(schedule.start, 'HH:mm', { zone: schedule.timezone });
    const endTime = DateTime.fromFormat(schedule.end, 'HH:mm', { zone: schedule.timezone });

    // Normalize checking "now" against start/end times irrespective of date
    // We construct DateTimes for start/end using "today's" date
    const todayStart = now.set({
        hour: startTime.hour,
        minute: startTime.minute,
        second: 0
    });

    const todayEnd = now.set({
        hour: endTime.hour,
        minute: endTime.minute,
        second: 0
    });

    return now >= todayStart && now <= todayEnd;
}

export function getNextSendingTime(schedule: ScheduleConfig): Date {
    // Simple logic: returns a Date object ideally for "tomorrow start time" or "next Monday"
    // For MVP, we can just return regular "delay" intervals from the queue if we want.
    // But strictly, we should calculate the next valid window start.

    const now = DateTime.now().setZone(schedule.timezone);
    let nextDate = now.plus({ minutes: 15 }); // Baseline check again in 15 mins?

    // A robust implementation would loop days until finding a valid slot
    // This is a simplified placeholder
    return nextDate.toJSDate();
}

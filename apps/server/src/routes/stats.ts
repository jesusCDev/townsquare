import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { habits, habitEntries } from '../db/schema.js';
import { eq, gte, lte, and, min as sqlMin } from 'drizzle-orm';
import { startOfWeek, startOfMonth, startOfQuarter, startOfYear, endOfWeek, endOfMonth, endOfQuarter, endOfYear, format, parseISO, differenceInDays, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isWithinInterval } from 'date-fns';

interface WinStats {
  startDate: string;
  totalDays: number;
  daysWon: number;
  weeksWon: number;
  monthsWon: number;
  quartersWon: number;
  yearsWon: number;
  currentStreak: number;
  bestStreak: number;
}

// Helper to check if all habits were completed on a given day
async function isDayWon(dateStr: string): Promise<boolean> {
  // Get all active (non-archived) habits
  const activeHabits = await db
    .select()
    .from(habits)
    .where(eq(habits.isArchived, false));

  if (activeHabits.length === 0) return false;

  // Get entries for this date
  const entries = await db
    .select()
    .from(habitEntries)
    .where(eq(habitEntries.date, dateStr));

  // Create a set of habit IDs that have at least one completion
  const completedHabitIds = new Set(
    entries.filter(e => e.count >= 1).map(e => e.habitId)
  );

  // Check if ALL active habits have at least one completion
  return activeHabits.every(habit => completedHabitIds.has(habit.id));
}

// Get the earliest habit entry date
async function getEarliestEntryDate(): Promise<string | null> {
  const result = await db
    .select({ earliestDate: sqlMin(habitEntries.date) })
    .from(habitEntries);

  return result[0]?.earliestDate || null;
}

export const statsRoutes: FastifyPluginAsync = async (app) => {
  // Get days won stats
  app.get('/api/stats/days-won', async (request, reply) => {
    const earliestDate = await getEarliestEntryDate();

    if (!earliestDate) {
      return {
        startDate: null,
        totalDays: 0,
        daysWon: 0,
        weeksWon: 0,
        monthsWon: 0,
        quartersWon: 0,
        yearsWon: 0,
        currentStreak: 0,
        bestStreak: 0,
      };
    }

    const startDate = parseISO(earliestDate);
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    // Get all days from start to today
    const allDays = eachDayOfInterval({ start: startDate, end: today });
    const totalDays = allDays.length;

    // Check each day if it's won
    const dayResults: { date: string; won: boolean }[] = [];
    for (const day of allDays) {
      const dateStr = format(day, 'yyyy-MM-dd');
      const won = await isDayWon(dateStr);
      dayResults.push({ date: dateStr, won });
    }

    // Count days won
    const daysWon = dayResults.filter(d => d.won).length;

    // Calculate streaks
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    // Count from today backwards for current streak
    for (let i = dayResults.length - 1; i >= 0; i--) {
      if (dayResults[i].won) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate best streak
    for (const day of dayResults) {
      if (day.won) {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // Calculate weeks won (4/7 days = won)
    const weeks = eachWeekOfInterval({ start: startDate, end: today }, { weekStartsOn: 1 });
    let weeksWon = 0;
    for (const weekStart of weeks) {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const daysInWeek = dayResults.filter(d => {
        const dayDate = parseISO(d.date);
        return isWithinInterval(dayDate, { start: weekStart, end: weekEnd });
      });
      const wonDaysInWeek = daysInWeek.filter(d => d.won).length;
      if (wonDaysInWeek >= 4) weeksWon++;
    }

    // Calculate months won (3/4 weeks = won)
    const months = eachMonthOfInterval({ start: startDate, end: today });
    let monthsWon = 0;
    for (const monthStart of months) {
      const monthEnd = endOfMonth(monthStart);
      const weeksInMonth = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });
      let wonWeeksInMonth = 0;
      for (const weekStart of weeksInMonth) {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const daysInWeek = dayResults.filter(d => {
          const dayDate = parseISO(d.date);
          return isWithinInterval(dayDate, { start: weekStart, end: weekEnd });
        });
        const wonDaysInWeek = daysInWeek.filter(d => d.won).length;
        if (wonDaysInWeek >= 4) wonWeeksInMonth++;
      }
      const totalWeeksInMonth = weeksInMonth.length;
      const requiredWeeks = Math.ceil(totalWeeksInMonth * 0.75);
      if (wonWeeksInMonth >= requiredWeeks) monthsWon++;
    }

    // Calculate quarters won (3/4 months = won, i.e., at least 3 months in a quarter)
    let quartersWon = 0;
    const quarters = [];
    let currentQuarterStart = startOfQuarter(startDate);
    while (currentQuarterStart <= today) {
      quarters.push(currentQuarterStart);
      currentQuarterStart = startOfQuarter(new Date(currentQuarterStart.getFullYear(), currentQuarterStart.getMonth() + 3, 1));
    }
    for (const quarterStart of quarters) {
      const quarterEnd = endOfQuarter(quarterStart);
      const monthsInQuarter = eachMonthOfInterval({ start: quarterStart, end: quarterEnd });
      let wonMonthsInQuarter = 0;
      for (const monthStart of monthsInQuarter) {
        const monthEnd = endOfMonth(monthStart);
        const weeksInMonth = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });
        let wonWeeksInMonth = 0;
        for (const weekStart of weeksInMonth) {
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
          const daysInWeek = dayResults.filter(d => {
            const dayDate = parseISO(d.date);
            return isWithinInterval(dayDate, { start: weekStart, end: weekEnd });
          });
          const wonDaysInWeek = daysInWeek.filter(d => d.won).length;
          if (wonDaysInWeek >= 4) wonWeeksInMonth++;
        }
        const totalWeeksInMonth = weeksInMonth.length;
        const requiredWeeks = Math.ceil(totalWeeksInMonth * 0.75);
        if (wonWeeksInMonth >= requiredWeeks) wonMonthsInQuarter++;
      }
      if (wonMonthsInQuarter >= 3) quartersWon++;
    }

    // Calculate years won (7/12 months = won)
    let yearsWon = 0;
    const startYear = startDate.getFullYear();
    const endYear = today.getFullYear();
    for (let year = startYear; year <= endYear; year++) {
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31);
      const monthsInYear = eachMonthOfInterval({ start: yearStart, end: yearEnd });
      let wonMonthsInYear = 0;
      for (const monthStart of monthsInYear) {
        const monthEnd = endOfMonth(monthStart);
        // Skip months outside our tracking period
        if (monthEnd < startDate || monthStart > today) continue;

        const weeksInMonth = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });
        let wonWeeksInMonth = 0;
        for (const weekStart of weeksInMonth) {
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
          const daysInWeek = dayResults.filter(d => {
            const dayDate = parseISO(d.date);
            return isWithinInterval(dayDate, { start: weekStart, end: weekEnd });
          });
          const wonDaysInWeek = daysInWeek.filter(d => d.won).length;
          if (wonDaysInWeek >= 4) wonWeeksInMonth++;
        }
        const totalWeeksInMonth = weeksInMonth.length;
        const requiredWeeks = Math.ceil(totalWeeksInMonth * 0.75);
        if (wonWeeksInMonth >= requiredWeeks) wonMonthsInYear++;
      }
      if (wonMonthsInYear >= 7) yearsWon++;
    }

    return {
      startDate: earliestDate,
      totalDays,
      daysWon,
      weeksWon,
      monthsWon,
      quartersWon,
      yearsWon,
      currentStreak,
      bestStreak,
    };
  });
};

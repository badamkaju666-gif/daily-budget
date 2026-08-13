import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  dateStringToUtcDate,
  getDateStringInTimezone,
  utcDateToDateString,
} from "@/lib/date";
import DashboardClient from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session =
    await auth.api.getSession({
      headers: await headers(),
    });

  if (!session) {
    redirect("/login");
  }

  const budget =
    await prisma.budget.findFirst({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

  if (!budget) {
    redirect("/setup");
  }

  const user =
    await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        timezone: true,
      },
    });

  const timezone =
    user?.timezone ?? "Asia/Kolkata";

  /*
   * Today's calendar date.
   */
  const todayString =
    getDateStringInTimezone(
      timezone
    );

  const today =
    dateStringToUtcDate(
      todayString
    );

  /*
   * IMPORTANT:
   *
   * Normalize the budget start date to a
   * calendar date.
   *
   * We must NOT use budget.startDate directly
   * because it may contain a time component.
   */
  const startDateString =
    utcDateToDateString(
      budget.startDate
    );

  const startDate =
    dateStringToUtcDate(
      startDateString
    );

  /*
   * Find the limit currently active today.
   */
  const currentBudgetChange =
    await prisma.budgetChange.findFirst({
      where: {
        budgetId: budget.id,
        effectiveDate: {
          lte: today,
        },
      },
      orderBy: {
        effectiveDate: "desc",
      },
    });

  const currentDailyLimit =
    currentBudgetChange?.dailyLimit ??
    budget.initialDailyLimit;

  /*
   * Today's entry.
   */
  const todayEntry =
    await prisma.dailyEntry.findUnique({
      where: {
        budgetId_date: {
          budgetId: budget.id,
          date: today,
        },
      },
    });

  /*
   * Start of the current week.
   * Monday = first day of week.
   */
  const weekDay =
    today.getUTCDay();

  const daysFromMonday =
    weekDay === 0
      ? 6
      : weekDay - 1;

  const weekStart =
    new Date(today);

  weekStart.setUTCDate(
    today.getUTCDate() -
      daysFromMonday
  );

  /*
   * Start of current month.
   */
  const monthStart =
    new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        1
      )
    );

  /*
   * Get every recorded entry from the
   * actual calendar start of the budget
   * through today.
   */
  const allEntries =
    await prisma.dailyEntry.findMany({
      where: {
        budgetId: budget.id,
        date: {
          gte: startDate,
          lte: today,
        },
      },
      orderBy: {
        date: "asc",
      },
    });

  /*
   * TOTAL BALANCE
   *
   * Every day's result contributes to the
   * running balance.
   *
   * Example:
   *
   * Aug 12 → +₹30
   * Aug 13 → ₹0
   *
   * Current Balance = +₹30
   */
  const currentBalance =
    allEntries.reduce(
      (total, entry) =>
        total + entry.result,
      0
    );

  /*
   * Current week's balance.
   */
  const weeklyBalance =
    allEntries
      .filter(
        (entry) =>
          entry.date >= weekStart
      )
      .reduce(
        (total, entry) =>
          total + entry.result,
        0
      );

  /*
   * Current month's balance.
   */
  const monthlyBalance =
    allEntries
      .filter(
        (entry) =>
          entry.date >= monthStart
      )
      .reduce(
        (total, entry) =>
          total + entry.result,
        0
      );

  return (
    <DashboardClient
      user={{
        name: session.user.name,
        email: session.user.email,
      }}
      budget={{
        id: budget.id,
        startDate:
          budget.startDate.toISOString(),
        initialDailyLimit:
          budget.initialDailyLimit,
      }}
      todayEntry={
        todayEntry
          ? {
              amountSpent:
                todayEntry.amountSpent,
              dailyLimit:
                todayEntry.dailyLimit,
              result:
                todayEntry.result,
              status:
                todayEntry.status,
            }
          : null
      }
      currentDailyLimit={
        currentDailyLimit
      }
      currentBalance={
        currentBalance
      }
      weeklyBalance={
        weeklyBalance
      }
      monthlyBalance={
        monthlyBalance
      }
    />
  );
}
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  dateStringToUtcDate,
  getDateStringInTimezone,
  utcDateToDateString,
} from "@/lib/date";
import AnalyticsCharts from "./analytics-charts";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    month?: string;
  }>;
};

type WeekData = {
  start: Date;
  end: Date;
  saved: number;
  overspent: number;
  spent: number;
  balance: number;
};

function isValidMonth(
  value: string | undefined
) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}$/.test(value)
  );
}

function getMonthStart(month: string) {
  return dateStringToUtcDate(
    `${month}-01`
  );
}

function getNextMonth(month: string) {
  const date = getMonthStart(month);

  date.setUTCMonth(
    date.getUTCMonth() + 1
  );

  return date
    .toISOString()
    .slice(0, 7);
}

function getPreviousMonth(
  month: string
) {
  const date = getMonthStart(month);

  date.setUTCMonth(
    date.getUTCMonth() - 1
  );

  return date
    .toISOString()
    .slice(0, 7);
}

function formatMonth(month: string) {
  return getMonthStart(
    month
  ).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatDate(date: Date) {
  return date.toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }
  );
}

function formatResult(value: number) {
  if (value > 0) {
    return `+₹${value}`;
  }

  if (value < 0) {
    return `-₹${Math.abs(value)}`;
  }

  return "₹0";
}

export default async function AnalyticsPage({
  searchParams,
}: Props) {
  const params = await searchParams;

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
    user?.timezone ??
    "Asia/Kolkata";

  const todayString =
    getDateStringInTimezone(
      timezone
    );

  const currentMonth =
    todayString.slice(0, 7);

  const month =
    isValidMonth(params.month)
      ? params.month!
      : currentMonth;

  const monthStart =
    getMonthStart(month);

  const nextMonth =
    getNextMonth(month);

  const nextMonthStart =
    getMonthStart(nextMonth);

  const previousMonth =
    getPreviousMonth(month);

  const budgetStartMonth =
    utcDateToDateString(
      budget.startDate
    ).slice(0, 7);

  if (
    month < budgetStartMonth
  ) {
    redirect(
      `/analytics?month=${budgetStartMonth}`
    );
  }

  /*
   * Get all recorded entries for
   * the selected month.
   */
  const entries =
    await prisma.dailyEntry.findMany({
      where: {
        budgetId: budget.id,
        date: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
      orderBy: {
        date: "asc",
      },
    });

  /*
   * MONTHLY TOTALS
   */

  const monthlySaved =
    entries
      .filter(
        (entry) =>
          entry.result > 0
      )
      .reduce(
        (total, entry) =>
          total + entry.result,
        0
      );

  const monthlyOverspent =
    entries
      .filter(
        (entry) =>
          entry.result < 0
      )
      .reduce(
        (total, entry) =>
          total +
          Math.abs(entry.result),
        0
      );

  const monthlySpent =
    entries.reduce(
      (total, entry) =>
        total +
        entry.amountSpent,
      0
    );

  const monthlyClosingBalance =
    entries.reduce(
      (total, entry) =>
        total + entry.result,
      0
    );

  /*
   * TOTAL ALLOWED FOR RECORDED DAYS
   *
   * We intentionally calculate this from
   * the dailyLimit stored on each entry.
   *
   * This correctly handles changes such as:
   *
   * Aug 12 → ₹100
   * Aug 13 → ₹150
   * Aug 14 → ₹70
   */
  const monthlyAllowed =
    entries.reduce(
      (total, entry) =>
        total +
        entry.dailyLimit,
      0
    );

  /*
   * WEEKLY DATA
   */

  const weeks =
    new Map<string, WeekData>();

  for (const entry of entries) {
    const day =
      entry.date.getUTCDay();

    const daysFromMonday =
      day === 0 ? 6 : day - 1;

    const weekStart =
      new Date(entry.date);

    weekStart.setUTCDate(
      entry.date.getUTCDate() -
        daysFromMonday
    );

    const weekKey =
      weekStart
        .toISOString()
        .slice(0, 10);

    if (!weeks.has(weekKey)) {
      const weekEnd =
        new Date(weekStart);

      weekEnd.setUTCDate(
        weekStart.getUTCDate() + 6
      );

      weeks.set(weekKey, {
        start: weekStart,
        end: weekEnd,
        saved: 0,
        overspent: 0,
        spent: 0,
        balance: 0,
      });
    }

    const week =
      weeks.get(weekKey)!;

    week.spent +=
      entry.amountSpent;

    week.balance +=
      entry.result;

    if (entry.result > 0) {
      week.saved +=
        entry.result;
    }

    if (entry.result < 0) {
      week.overspent +=
        Math.abs(entry.result);
    }
  }

  const weeklyData =
    Array.from(
      weeks.values()
    ).sort(
      (a, b) =>
        a.start.getTime() -
        b.start.getTime()
    );

  /*
   * RUNNING BALANCE
   */

  let runningBalance = 0;

  const runningBalances =
    entries.map((entry) => {
      runningBalance +=
        entry.result;

      return {
        date: entry.date,
        result: entry.result,
        balance: runningBalance,
      };
    });

  /*
   * CHART DATA
   */

  const dailyChartData =
    entries.map((entry) => ({
      date: entry.date.toLocaleDateString(
        "en-IN",
        {
          day: "numeric",
          month: "short",
          timeZone: "UTC",
        }
      ),
      result: entry.result,
    }));

  const balanceChartData =
    runningBalances.map(
      (entry) => ({
        date: entry.date.toLocaleDateString(
          "en-IN",
          {
            day: "numeric",
            month: "short",
            timeZone: "UTC",
          }
        ),
        balance: entry.balance,
      })
    );

  /*
   * MONTH-END MESSAGE
   */

  let monthEndMessage =
    "No spending has been recorded for this month yet.";

  if (entries.length > 0) {
    if (monthlyClosingBalance > 0) {
      monthEndMessage =
        `You stayed under your budget and finished the month with ₹${monthlyClosingBalance} saved.`;
    } else if (
      monthlyClosingBalance < 0
    ) {
      monthEndMessage =
        `You finished the month ₹${Math.abs(monthlyClosingBalance)} over your budget.`;
    } else {
      monthEndMessage =
        "You spent exactly your available budget for the recorded days.";
    }
  }

  const isCurrentMonth =
    month === currentMonth;

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">

        {/* HEADER */}
        <header className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-sm font-medium text-muted-foreground">
                DAILY BUDGET
              </p>

              <h1 className="mt-1 text-3xl font-bold">
                Analytics
              </h1>

              <p className="mt-2 text-sm text-muted-foreground">
                Understand where your money went.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard"
                className="rounded-lg border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted"
              >
                Dashboard
              </Link>

              <Link
                href="/calendar"
                className="rounded-lg border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted"
              >
                Calendar
              </Link>

              <Link
                href="/history"
                className="rounded-lg border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted"
              >
                History
              </Link>
            </div>
          </div>
        </header>

        {/* MONTH NAVIGATION */}
        <section className="rounded-xl border bg-background p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">

            <Link
              href={`/analytics?month=${previousMonth}`}
              className="rounded-lg border px-3 py-2 text-sm font-medium transition hover:bg-muted"
            >
              ←
            </Link>

            <div className="text-center">
              <h2 className="text-xl font-bold sm:text-2xl">
                {formatMonth(month)}
              </h2>

              {isCurrentMonth && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Current month
                </p>
              )}
            </div>

            {isCurrentMonth ? (
              <div className="w-[42px]" />
            ) : (
              <Link
                href={`/analytics?month=${nextMonth}`}
                className="rounded-lg border px-3 py-2 text-sm font-medium transition hover:bg-muted"
              >
                →
              </Link>
            )}
          </div>
        </section>

        {/* MONTHLY SUMMARY */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-xl border bg-background p-5">
            <p className="text-sm text-muted-foreground">
              Total Allowed
            </p>

            <p className="mt-2 text-3xl font-bold">
              ₹{monthlyAllowed}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              For recorded days
            </p>
          </div>

          <div className="rounded-xl border bg-background p-5">
            <p className="text-sm text-muted-foreground">
              Total Spent
            </p>

            <p className="mt-2 text-3xl font-bold">
              ₹{monthlySpent}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Across {entries.length} recorded days
            </p>
          </div>

          <div className="rounded-xl border bg-background p-5">
            <p className="text-sm text-muted-foreground">
              Total Saved
            </p>

            <p className="mt-2 text-3xl font-bold text-green-600">
              +₹{monthlySaved}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Money kept under your limits
            </p>
          </div>

          <div className="rounded-xl border bg-background p-5">
            <p className="text-sm text-muted-foreground">
              Closing Balance
            </p>

            <p
              className={`mt-2 text-3xl font-bold ${
                monthlyClosingBalance > 0
                  ? "text-green-600"
                  : monthlyClosingBalance < 0
                    ? "text-red-600"
                    : ""
              }`}
            >
              {formatResult(
                monthlyClosingBalance
              )}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Saved minus overspent
            </p>
          </div>
        </section>

        {/* WEEKLY SUMMARY */}
        <section className="mt-6 rounded-xl border bg-background p-6">
          <h2 className="text-xl font-semibold">
            Weekly Summary
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            How each week performed.
          </p>

          {weeklyData.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No spending has been recorded this month yet.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {weeklyData.map(
                (week) => (
                  <div
                    key={week.start.toISOString()}
                    className="rounded-xl border p-4"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-semibold">
                        {formatDate(
                          week.start
                        )}{" "}
                        –{" "}
                        {formatDate(
                          week.end
                        )}
                      </p>

                      <p
                        className={`font-bold ${
                          week.balance > 0
                            ? "text-green-600"
                            : week.balance < 0
                              ? "text-red-600"
                              : ""
                        }`}
                      >
                        {formatResult(
                          week.balance
                        )}
                      </p>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3">

                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">
                          Spent
                        </p>

                        <p className="mt-1 font-semibold">
                          ₹{week.spent}
                        </p>
                      </div>

                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">
                          Saved
                        </p>

                        <p className="mt-1 font-semibold text-green-600">
                          +₹{week.saved}
                        </p>
                      </div>

                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">
                          Overspent
                        </p>

                        <p className="mt-1 font-semibold text-red-600">
                          -₹{week.overspent}
                        </p>
                      </div>

                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* RUNNING BALANCE */}
        <section className="mt-6 rounded-xl border bg-background p-6">

          <h2 className="text-xl font-semibold">
            Running Balance
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            See how your saved or overspent money accumulated throughout the month.
          </p>

          {runningBalances.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No recorded days yet.
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[500px] text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3 font-medium text-muted-foreground">
                      Date
                    </th>

                    <th className="pb-3 font-medium text-muted-foreground">
                      Daily Result
                    </th>

                    <th className="pb-3 text-right font-medium text-muted-foreground">
                      Closing Balance
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {runningBalances.map(
                    (item) => (
                      <tr
                        key={item.date.toISOString()}
                        className="border-b last:border-b-0"
                      >
                        <td className="py-3">
                          {formatDate(
                            item.date
                          )}
                        </td>

                        <td
                          className={`py-3 font-semibold ${
                            item.result > 0
                              ? "text-green-600"
                              : item.result < 0
                                ? "text-red-600"
                                : ""
                          }`}
                        >
                          {formatResult(
                            item.result
                          )}
                        </td>

                        <td
                          className={`py-3 text-right font-bold ${
                            item.balance > 0
                              ? "text-green-600"
                              : item.balance < 0
                                ? "text-red-600"
                                : ""
                          }`}
                        >
                          {formatResult(
                            item.balance
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* WHAT CHANGED MY BALANCE */}
        <section className="mt-6 rounded-xl border bg-background p-6">

          <h2 className="text-xl font-semibold">
            What Changed My Balance?
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            See exactly how each recorded day affected your balance.
          </p>

          {entries.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No recorded days yet.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {entries.map(
                (entry) => {
                  let description =
                    "Spent exactly your daily limit.";

                  if (entry.result > 0) {
                    description =
                      `Saved ₹${entry.result} under your ₹${entry.dailyLimit} limit.`;
                  }

                  if (entry.result < 0) {
                    description =
                      `Overspent ₹${Math.abs(entry.result)} above your ₹${entry.dailyLimit} limit.`;
                  }

                  return (
                    <div
                      key={entry.id}
                      className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold">
                          {formatDate(
                            entry.date
                          )}
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                          {description}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          Spent ₹
                          {
                            entry.amountSpent
                          }{" "}
                          of ₹
                          {
                            entry.dailyLimit
                          }
                        </p>
                      </div>

                      <p
                        className={`text-xl font-bold ${
                          entry.result > 0
                            ? "text-green-600"
                            : entry.result < 0
                              ? "text-red-600"
                              : ""
                        }`}
                      >
                        {formatResult(
                          entry.result
                        )}
                      </p>
                    </div>
                  );
                }
              )}
            </div>
          )}

          {entries.length > 0 && (
            <div className="mt-5 rounded-lg bg-muted/40 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="font-medium">
                  Month's net change
                </p>

                <p
                  className={`text-xl font-bold ${
                    monthlyClosingBalance > 0
                      ? "text-green-600"
                      : monthlyClosingBalance < 0
                        ? "text-red-600"
                        : ""
                  }`}
                >
                  {formatResult(
                    monthlyClosingBalance
                  )}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* MONTH-END SUMMARY */}
        <section className="mt-6 rounded-xl border bg-background p-6">

          <div>
            <p className="text-sm font-medium text-muted-foreground">
              MONTH-END SUMMARY
            </p>

            <h2 className="mt-1 text-2xl font-bold">
              {formatMonth(month)}
            </h2>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">
                Days Recorded
              </p>

              <p className="mt-1 text-2xl font-bold">
                {entries.length}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">
                Total Allowed
              </p>

              <p className="mt-1 text-2xl font-bold">
                ₹{monthlyAllowed}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">
                Total Spent
              </p>

              <p className="mt-1 text-2xl font-bold">
                ₹{monthlySpent}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">
                Total Saved
              </p>

              <p className="mt-1 text-2xl font-bold text-green-600">
                +₹{monthlySaved}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">
                Total Overspent
              </p>

              <p className="mt-1 text-2xl font-bold text-red-600">
                -₹{monthlyOverspent}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">
                Closing Balance
              </p>

              <p
                className={`mt-1 text-2xl font-bold ${
                  monthlyClosingBalance > 0
                    ? "text-green-600"
                    : monthlyClosingBalance < 0
                      ? "text-red-600"
                      : ""
                }`}
              >
                {formatResult(
                  monthlyClosingBalance
                )}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-muted/40 p-5">
            <p className="font-semibold">
              {monthEndMessage}
            </p>

            <p className="mt-2 text-sm text-muted-foreground">
              Only days that you have explicitly recorded are included in this summary.
            </p>
          </div>
        </section>

        {/* CHARTS */}
        <AnalyticsCharts
          dailyData={
            dailyChartData
          }
          balanceData={
            balanceChartData
          }
        />

      </div>
    </main>
  );
}
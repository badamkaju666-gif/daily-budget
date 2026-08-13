import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  addDays,
  dateStringToUtcDate,
  getDateStringInTimezone,
  utcDateToDateString,
} from "@/lib/date";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    month?: string;
  }>;
};

function isValidMonth(
  value: string | undefined
) {
  if (!value) {
    return false;
  }

  return /^\d{4}-\d{2}$/.test(value);
}

function getMonthStart(
  month: string
) {
  return dateStringToUtcDate(
    `${month}-01`
  );
}

function getNextMonth(
  month: string
) {
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

function formatMonth(
  month: string
) {
  return getMonthStart(
    month
  ).toLocaleDateString(
    "en-IN",
    {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }
  );
}

function formatShortDate(
  dateString: string
) {
  return dateStringToUtcDate(
    dateString
  ).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }
  );
}

function getDaysInMonth(
  month: string
) {
  const start =
    getMonthStart(month);

  const end = new Date(start);

  end.setUTCMonth(
    end.getUTCMonth() + 1
  );

  end.setUTCDate(0);

  return end.getUTCDate();
}

export default async function CalendarPage({
  searchParams,
}: Props) {
  const params =
    await searchParams;

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
   * Today's date according to the user's
   * timezone.
   */
  const todayString =
    getDateStringInTimezone(
      timezone
    );

  /*
   * If no month is supplied, open the
   * current month.
   */
  const currentMonth =
    todayString.slice(0, 7);

  const month =
    isValidMonth(params.month)
      ? params.month!
      : currentMonth;

  /*
   * Prevent navigating to a month before
   * the budget started.
   */
  const budgetStartDateString =
    utcDateToDateString(
      budget.startDate
    );

  const budgetStartMonth =
    budgetStartDateString.slice(
      0,
      7
    );

  /*
   * Don't allow viewing months before the
   * budget started.
   */
  if (month < budgetStartMonth) {
    redirect(
      `/calendar?month=${budgetStartMonth}`
    );
  }

  const monthStart =
    getMonthStart(month);

  const daysInMonth =
    getDaysInMonth(month);

  const nextMonth =
    getNextMonth(month);

  const previousMonth =
    getPreviousMonth(month);

  const nextMonthStart =
    getMonthStart(nextMonth);

  /*
   * We query through the end of this month.
   *
   * Since the database stores each daily entry
   * at UTC midnight, this gives us exactly the
   * calendar dates we need.
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
   * Map entries by calendar date.
   */
  const entriesByDate =
    new Map(
      entries.map((entry) => [
        utcDateToDateString(
          entry.date
        ),
        entry,
      ])
    );

  /*
   * JavaScript:
   *
   * Sunday = 0
   * Monday = 1
   * ...
   *
   * We want Monday as the first column.
   */
  const firstDay =
    monthStart.getUTCDay();

  const emptyCellsBefore =
    firstDay === 0
      ? 6
      : firstDay - 1;

  /*
   * Build calendar cells.
   *
   * We add empty cells before the first
   * day and after the last day so the grid
   * remains aligned.
   */
  const calendarCells: Array<
    string | null
  > = [];

  for (
    let i = 0;
    i < emptyCellsBefore;
    i++
  ) {
    calendarCells.push(null);
  }

  for (
    let day = 1;
    day <= daysInMonth;
    day++
  ) {
    const date =
      new Date(monthStart);

    date.setUTCDate(day);

    calendarCells.push(
      date
        .toISOString()
        .slice(0, 10)
    );
  }

  while (
    calendarCells.length % 7 !==
    0
  ) {
    calendarCells.push(null);
  }

  /*
   * Don't show a "next month" button when
   * we're already looking at the current month.
   */
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
                Calendar
              </h1>

              <p className="mt-2 text-sm text-muted-foreground">
                See your daily savings, spending and overspending.
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
              href={`/calendar?month=${previousMonth}`}
              className="rounded-lg border px-3 py-2 text-sm font-medium transition hover:bg-muted"
              aria-label="Previous month"
            >
              ←
            </Link>

            <div className="text-center">
              <h2 className="text-xl font-bold sm:text-2xl">
                {formatMonth(month)}
              </h2>

              {month === currentMonth && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Current month
                </p>
              )}
            </div>

            {isCurrentMonth ? (
              <div
                className="w-[42px]"
                aria-hidden="true"
              />
            ) : (
              <Link
                href={`/calendar?month=${nextMonth}`}
                className="rounded-lg border px-3 py-2 text-sm font-medium transition hover:bg-muted"
                aria-label="Next month"
              >
                →
              </Link>
            )}
          </div>

          {/* WEEKDAY HEADER */}
          <div className="mt-6 grid grid-cols-7 border-b pb-2">
            {[
              "Mon",
              "Tue",
              "Wed",
              "Thu",
              "Fri",
              "Sat",
              "Sun",
            ].map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground sm:text-sm"
              >
                {day}
              </div>
            ))}
          </div>

          {/* CALENDAR */}
          <div className="mt-2 grid grid-cols-7">
            {calendarCells.map(
              (dateString, index) => {
                if (!dateString) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className="min-h-[80px] border-b border-r p-1 sm:min-h-[110px] sm:p-2"
                    />
                  );
                }

                const entry =
                  entriesByDate.get(
                    dateString
                  );

                const isToday =
                  dateString ===
                  todayString;

                const isFuture =
                  dateString >
                  todayString;

                const isBeforeBudget =
                  dateString <
                  budgetStartDateString;

                const result =
                  entry?.result ?? null;

                let resultText =
                  "—";

                if (result !== null) {
                  if (result > 0) {
                    resultText =
                      `+₹${result}`;
                  } else if (
                    result < 0
                  ) {
                    resultText =
                      `-₹${Math.abs(
                        result
                      )}`;
                  } else {
                    resultText =
                      "₹0";
                  }
                }

                const cellContent = (
                  <div
                    className={`flex min-h-[80px] flex-col rounded-lg p-2 sm:min-h-[110px] sm:p-3 ${
                      isToday
                        ? "ring-2 ring-black"
                        : ""
                    } ${
                      isFuture ||
                      isBeforeBudget
                        ? "opacity-40"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span
                        className={`text-sm font-semibold ${
                          isToday
                            ? "rounded-full bg-black px-2 py-1 text-white"
                            : ""
                        }`}
                      >
                        {Number(
                          dateString.slice(
                            8,
                            10
                          )
                        )}
                      </span>

                      {entry && (
                        <span
                          className={`hidden text-[10px] font-medium sm:inline ${
                            result! > 0
                              ? "text-green-600"
                              : result! < 0
                                ? "text-red-600"
                                : "text-muted-foreground"
                          }`}
                        >
                          {result! > 0
                            ? "Saved"
                            : result! < 0
                              ? "Over"
                              : "Spent"}
                        </span>
                      )}
                    </div>

                    <div className="mt-auto">
                      <p
                        className={`text-sm font-bold sm:text-base ${
                          result === null
                            ? "text-muted-foreground"
                            : result > 0
                              ? "text-green-600"
                              : result < 0
                                ? "text-red-600"
                                : "text-foreground"
                        }`}
                      >
                        {resultText}
                      </p>

                      {entry && (
                        <p className="mt-1 hidden text-[10px] text-muted-foreground sm:block">
                          Spent ₹
                          {
                            entry.amountSpent
                          }
                        </p>
                      )}
                    </div>
                  </div>
                );

                /*
                 * Future days and days before the
                 * budget started aren't editable.
                 */
                if (
                  isFuture ||
                  isBeforeBudget
                ) {
                  return (
                    <div
                      key={dateString}
                      className="border-b border-r p-1 sm:p-2"
                    >
                      {cellContent}
                    </div>
                  );
                }

                return (
                  <Link
                    key={dateString}
                    href={`/history/${dateString}`}
                    className="border-b border-r p-1 transition hover:bg-muted/50 sm:p-2"
                  >
                    {cellContent}
                  </Link>
                );
              }
            )}
          </div>
        </section>

        {/* LEGEND */}
        <section className="mt-6 rounded-xl border bg-background p-5">
          <h2 className="font-semibold">
            What the numbers mean
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="font-bold text-green-600">
                +₹30
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Saved ₹30 that day
              </p>
            </div>

            <div className="rounded-lg border p-3">
              <p className="font-bold">
                ₹0
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Spent exactly the daily limit
              </p>
            </div>

            <div className="rounded-lg border p-3">
              <p className="font-bold text-red-600">
                -₹30
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Overspent ₹30 that day
              </p>
            </div>
          </div>
        </section>

        {/* MONTH INFO */}
        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-background p-5">
            <p className="text-sm text-muted-foreground">
              Recorded days
            </p>

            <p className="mt-1 text-2xl font-bold">
              {entries.length}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Days with spending entered
            </p>
          </div>

          <div className="rounded-xl border bg-background p-5">
            <p className="text-sm text-muted-foreground">
              Saved this month
            </p>

            <p className="mt-1 text-2xl font-bold text-green-600">
              +₹
              {entries
                .filter(
                  (entry) =>
                    entry.result > 0
                )
                .reduce(
                  (total, entry) =>
                    total +
                    entry.result,
                  0
                )}
            </p>
          </div>

          <div className="rounded-xl border bg-background p-5">
            <p className="text-sm text-muted-foreground">
              Closing balance
            </p>

            {(() => {
              const balance =
                entries.reduce(
                  (total, entry) =>
                    total +
                    entry.result,
                  0
                );

              return (
                <p
                  className={`mt-1 text-2xl font-bold ${
                    balance > 0
                      ? "text-green-600"
                      : balance < 0
                        ? "text-red-600"
                        : ""
                  }`}
                >
                  {balance > 0
                    ? `+₹${balance}`
                    : balance < 0
                      ? `-₹${Math.abs(
                          balance
                        )}`
                      : "₹0"}
                </p>
              );
            })()}
          </div>
        </section>
      </div>
    </main>
  );
}
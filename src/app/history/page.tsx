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

/*
 * This page must always read the latest database state.
 *
 * This is especially important because spending entries
 * can be edited from the History page.
 */
export const dynamic = "force-dynamic";

function formatDate(
  dateString: string
) {
  const date =
    dateStringToUtcDate(dateString);

  return date.toLocaleDateString(
    "en-IN",
    {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }
  );
}

export default async function HistoryPage() {
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
   * Today's calendar date for this user.
   */
  const todayString =
    getDateStringInTimezone(
      timezone
    );

  /*
   * Convert the budget start timestamp into
   * the actual calendar date on which the
   * budget started.
   *
   * Example:
   *
   * Database:
   * 2026-08-12T18:30:00Z
   *
   * Calendar date:
   * 2026-08-12
   */
  const startDateString =
    utcDateToDateString(
      budget.startDate
    );

  /*
   * IMPORTANT:
   *
   * Use the normalized calendar date for
   * the Prisma query.
   *
   * Do NOT use budget.startDate directly
   * because it may contain a time component.
   */
  const startDate =
    dateStringToUtcDate(
      startDateString
    );

  const today =
    dateStringToUtcDate(
      todayString
    );

  /*
   * Fetch all entries from the budget's
   * calendar start date through today.
   */
  const entries =
    await prisma.dailyEntry.findMany({
      where: {
        budgetId: budget.id,
        date: {
          gte: startDate,
          lte: today,
        },
      },
      orderBy: {
        date: "desc",
      },
    });

  /*
   * Convert every database timestamp into
   * its calendar date before putting it into
   * the map.
   *
   * This means:
   *
   * 2026-08-12T00:00:00Z → 2026-08-12
   * 2026-08-13T00:00:00Z → 2026-08-13
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
   * Build every calendar day from today
   * back to the budget start date.
   */
  const dates: string[] = [];

  let currentDate =
    todayString;

  while (
    currentDate >= startDateString
  ) {
    dates.push(currentDate);

    currentDate =
      addDays(
        currentDate,
        -1
      );
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">

        <header className="mb-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                DAILY BUDGET
              </p>

              <h1 className="mt-1 text-3xl font-bold">
                History
              </h1>

              <p className="mt-2 text-sm text-muted-foreground">
                Review and edit your previous days.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="rounded-lg border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted"
            >
              Dashboard
            </Link>
          </div>
        </header>

        <section className="overflow-hidden rounded-xl border bg-background">
          {dates.map(
            (dateString) => {
              const entry =
                entriesByDate.get(
                  dateString
                );

              const result =
                entry?.result ?? null;

              return (
                <Link
                  key={dateString}
                  href={`/history/${dateString}`}
                  className="flex items-center justify-between gap-4 border-b p-4 transition last:border-b-0 hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">
                      {formatDate(
                        dateString
                      )}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {entry
                        ? `Spent ₹${entry.amountSpent} of ₹${entry.dailyLimit}`
                        : "No spending recorded"}
                    </p>
                  </div>

                  <div className="text-right">
                    {result === null ? (
                      <p className="text-sm font-medium text-muted-foreground">
                        Not recorded
                      </p>
                    ) : (
                      <p
                        className={`text-lg font-bold ${
                          result > 0
                            ? "text-green-600"
                            : result < 0
                              ? "text-red-600"
                              : "text-foreground"
                        }`}
                      >
                        {result > 0
                          ? `+₹${result}`
                          : result < 0
                            ? `-₹${Math.abs(
                                result
                              )}`
                            : "₹0"}
                      </p>
                    )}

                    <p className="mt-1 text-xs text-muted-foreground">
                      Tap to edit
                    </p>
                  </div>
                </Link>
              );
            }
          )}
        </section>
      </div>
    </main>
  );
}
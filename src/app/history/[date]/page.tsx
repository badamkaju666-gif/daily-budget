import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  dateStringToUtcDate,
  getDateStringInTimezone,
  utcDateToDateString,
} from "@/lib/date";
import EditDailyEntry from "./edit-daily-entry";

type Props = {
  params: Promise<{
    date: string;
  }>;
};

export default async function EditHistoryPage({
  params,
}: Props) {
  const { date: dateString } = await params;

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

  const todayString =
    getDateStringInTimezone(timezone);

  const date =
    dateStringToUtcDate(dateString);

  const today =
    dateStringToUtcDate(todayString);

  /*
   * IMPORTANT:
   *
   * budget.startDate may contain a time, for example:
   *
   * 2026-08-12 15:30
   *
   * But a daily budget works with calendar dates.
   *
   * Convert the budget start date to its calendar
   * date first so August 12 is treated as August 12
   * regardless of the time stored in the database.
   */
  const budgetStartDateString =
    utcDateToDateString(
      budget.startDate
    );

  const budgetStartDate =
    dateStringToUtcDate(
      budgetStartDateString
    );

  /*
   * Don't allow future dates or dates before
   * the budget actually started.
   */
  if (
    date > today ||
    date < budgetStartDate
  ) {
    notFound();
  }

  /*
   * Find the entry for this particular date.
   */
  const entry =
    await prisma.dailyEntry.findUnique({
      where: {
        budgetId_date: {
          budgetId: budget.id,
          date,
        },
      },
    });

  /*
   * Find the budget limit that applied
   * on this particular date.
   */
  const latestChange =
    await prisma.budgetChange.findFirst({
      where: {
        budgetId: budget.id,
        effectiveDate: {
          lte: date,
        },
      },
      orderBy: {
        effectiveDate: "desc",
      },
    });

  const dailyLimit =
    entry?.dailyLimit ??
    latestChange?.dailyLimit ??
    budget.initialDailyLimit;

  const formattedDate =
    date.toLocaleDateString(
      "en-IN",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }
    );

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-md px-4 py-8">

        <Link
          href="/history"
          className="text-sm font-medium underline"
        >
          ← Back to History
        </Link>

        <div className="mt-8">
          <p className="text-sm text-muted-foreground">
            Daily Entry
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            {formattedDate}
          </h1>
        </div>

        <div className="mt-6 rounded-xl border bg-background p-6">
          <EditDailyEntry
            date={dateString}
            dailyLimit={dailyLimit}
            existingAmount={
              entry?.amountSpent ?? null
            }
          />
        </div>
      </div>
    </main>
  );
}
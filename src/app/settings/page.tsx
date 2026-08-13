import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  dateStringToUtcDate,
  getDateStringInTimezone,
} from "@/lib/date";
import BudgetSettingsClient from "./settings-client";
import DeleteButtonClient from "./delete-button-client";

export default async function SettingsPage() {
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

  const today =
    getDateStringInTimezone(timezone);

  const todayDate =
    dateStringToUtcDate(today);

  const currentChange =
    await prisma.budgetChange.findFirst({
      where: {
        budgetId: budget.id,
        effectiveDate: {
          lte: todayDate,
        },
      },
      orderBy: {
        effectiveDate: "desc",
      },
    });

  const currentDailyLimit =
    currentChange?.dailyLimit ??
    budget.initialDailyLimit;

  const futureChanges =
    await prisma.budgetChange.findMany({
      where: {
        budgetId: budget.id,
        effectiveDate: {
          gt: todayDate,
        },
      },
      orderBy: {
        effectiveDate: "asc",
      },
    });

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">

        <header className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm font-medium underline"
          >
            ← Back to Dashboard
          </Link>

          <p className="mt-6 text-sm font-medium text-muted-foreground">
            DAILY BUDGET
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Budget Settings
          </h1>

          <p className="mt-2 text-muted-foreground">
            Manage how much you're allowed to spend each day.
          </p>
        </header>

        <BudgetSettingsClient
          currentDailyLimit={
            currentDailyLimit
          }
          today={today}
        />

        {/* ORIGINAL LIMIT */}
        <section className="mt-6 rounded-xl border bg-background p-6">
          <h2 className="text-xl font-semibold">
            Original Budget
          </h2>

          <div className="mt-4 flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">
                ₹{budget.initialDailyLimit}/day
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Your original daily limit
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              {new Date(
                budget.startDate
              ).toLocaleDateString(
                "en-IN",
                {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  timeZone: "UTC",
                }
              )}
            </p>
          </div>
        </section>

        {/* FUTURE CHANGES */}
        <section className="mt-6 rounded-xl border bg-background p-6">
          <h2 className="text-xl font-semibold">
            Upcoming Limit Changes
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            These changes will automatically become active on
            their dates.
          </p>

          {futureChanges.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No upcoming limit changes.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {futureChanges.map(
                (change) => (
                  <div
                    key={change.id}
                    className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-lg font-semibold">
                        ₹{change.dailyLimit}/day
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Starts{" "}
                        {new Date(
                          change.effectiveDate
                        ).toLocaleDateString(
                          "en-IN",
                          {
                            weekday: "short",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            timeZone: "UTC",
                          }
                        )}
                      </p>
                    </div>

                    <DeleteButtonClient
                      changeId={change.id}
                    />
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import ThemeToggle from "@/components/theme-toggle";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { saveDailyEntry } from "@/actions/daily-entry";
import { updateUserTimezone } from "@/actions/user";

type DashboardClientProps = {
  user: {
    name: string;
    email: string;
  };

  budget: {
    id: string;
    startDate: string;
    initialDailyLimit: number;
  };

  todayEntry: {
    amountSpent: number;
    dailyLimit: number;
    result: number;
    status:
      | "SAVED"
      | "SPENT"
      | "OVERSPENT";
  } | null;

  currentDailyLimit: number;

  currentBalance: number;
  weeklyBalance: number;
  monthlyBalance: number;
};

export default function DashboardClient({
  user,
  budget,
  todayEntry,
  currentDailyLimit,
  currentBalance,
  weeklyBalance,
  monthlyBalance,
}: DashboardClientProps) {
  const router = useRouter();

  const [amountSpent, setAmountSpent] =
    useState(
      todayEntry
        ? String(todayEntry.amountSpent)
        : ""
    );

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const currentResult =
    todayEntry?.result ?? 0;

  /*
   * Save the user's browser timezone.
   */
  useEffect(() => {
    const timezone =
      Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone;

    updateUserTimezone(
      timezone
    ).catch(() => {
      // Timezone update should never
      // prevent the dashboard from working.
    });
  }, []);

  async function handleLogout() {
    await authClient.signOut();

    router.push("/login");
    router.refresh();
  }

  async function handleDailyEntry(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const amount =
      Number(amountSpent);

    if (
      !Number.isInteger(amount) ||
      amount < 0
    ) {
      setError(
        "Enter a valid amount."
      );
      return;
    }

    setSaving(true);

    const formData =
      new FormData();

    formData.append(
      "amountSpent",
      amountSpent
    );

    /*
     * Get today's date from the browser.
     */
    const today =
      new Date();

    const todayString = [
      today.getFullYear(),
      String(
        today.getMonth() + 1
      ).padStart(2, "0"),
      String(
        today.getDate()
      ).padStart(2, "0"),
    ].join("-");

    formData.append(
      "date",
      todayString
    );

    try {
      await saveDailyEntry(
        formData
      );

      router.refresh();
    } catch {
      setError(
        "Unable to save today's spending."
      );

      setSaving(false);
    }
  }

  function formatResult(
    result: number
  ) {
    if (result > 0) {
      return `+₹${result}`;
    }

    if (result < 0) {
      return `-₹${Math.abs(
        result
      )}`;
    }

    return "₹0";
  }

  function getResultColor(
    result: number
  ) {
    if (result > 0) {
      return "text-green-600";
    }

    if (result < 0) {
      return "text-red-600";
    }

    return "text-foreground";
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">

        {/* HEADER */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

          <div>
            <p className="text-sm font-medium text-muted-foreground">
              DAILY BUDGET
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Dashboard
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Welcome, {user.name}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/history"
                )
              }
              className="rounded-lg border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted"
            >
              History
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/settings"
                )
              }
              className="rounded-lg border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted"
            >
              Settings
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/calendar"
                )
              }
              className="rounded-lg border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted"
            >
              Calendar
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/analytics"
                )
              }
              className="rounded-lg border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted"
            >
              Analytics
            </button>

            <ThemeToggle />

            <button
              type="button"
              onClick={
                handleLogout
              }
              className="rounded-lg border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted"
            >
              Logout
            </button>

          </div>
        </header>

        {/* SUMMARY CARDS */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* CURRENT BALANCE */}
          <div className="rounded-xl border bg-background p-5">
            <p className="text-sm text-muted-foreground">
              Current Balance
            </p>

            <p
              className={`mt-2 text-3xl font-bold ${getResultColor(
                currentBalance
              )}`}
            >
              {formatResult(
                currentBalance
              )}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              All recorded days
            </p>
          </div>

          {/* TODAY'S LIMIT */}
          <div className="rounded-xl border bg-background p-5">
            <p className="text-sm text-muted-foreground">
              Today's Limit
            </p>

            <p className="mt-2 text-3xl font-bold">
              ₹{currentDailyLimit}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Current daily budget
            </p>
          </div>

          {/* THIS WEEK */}
          <div className="rounded-xl border bg-background p-5">
            <p className="text-sm text-muted-foreground">
              This Week
            </p>

            <p
              className={`mt-2 text-3xl font-bold ${getResultColor(
                weeklyBalance
              )}`}
            >
              {formatResult(
                weeklyBalance
              )}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Monday to today
            </p>
          </div>

          {/* THIS MONTH */}
          <div className="rounded-xl border bg-background p-5">
            <p className="text-sm text-muted-foreground">
              This Month
            </p>

            <p
              className={`mt-2 text-3xl font-bold ${getResultColor(
                monthlyBalance
              )}`}
            >
              {formatResult(
                monthlyBalance
              )}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Start of month to today
            </p>
          </div>

        </section>

        {/* TODAY'S SPENDING */}
        <section className="mt-6 rounded-xl border bg-background p-6">

          <h2 className="text-xl font-semibold">
            Today's Spending
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Record how much you actually spent today.
          </p>

          {/* DAILY LIMIT */}
          <div className="mt-6">
            <p className="text-sm text-muted-foreground">
              Today's limit
            </p>

            <p className="mt-1 text-2xl font-bold">
              ₹{currentDailyLimit}
            </p>
          </div>

          {/* SPENDING FORM */}
          <form
            onSubmit={
              handleDailyEntry
            }
            className="mt-6"
          >
            <label
              htmlFor="spent"
              className="text-sm font-medium"
            >
              How much did you spend today?
            </label>

            <input
              id="spent"
              name="amountSpent"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={amountSpent}
              onChange={(event) =>
                setAmountSpent(
                  event.target.value
                )
              }
              placeholder="0"
              className="mt-2 w-full rounded-lg border bg-background px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-black sm:max-w-sm"
            />

            <p className="mt-2 text-xs text-muted-foreground">
              Enter the actual amount you spent. ₹0 is allowed.
            </p>

            {error && (
              <p className="mt-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="mt-4 w-full rounded-lg bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {saving
                ? "Saving..."
                : "Save Today's Spending"}
            </button>
          </form>

          {/* TODAY'S RESULT */}
          {todayEntry && (
            <div className="mt-6 rounded-lg border bg-muted/30 p-4">

              <p className="text-sm font-medium">
                Today's Result
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">

                <div>
                  <p className="text-sm text-muted-foreground">
                    Daily limit
                  </p>

                  <p className="mt-1 text-xl font-semibold">
                    ₹
                    {
                      todayEntry.dailyLimit
                    }
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    You spent
                  </p>

                  <p className="mt-1 text-xl font-semibold">
                    ₹
                    {
                      todayEntry.amountSpent
                    }
                  </p>
                </div>

              </div>

              <div className="mt-5 border-t pt-4">

                <p className="text-sm text-muted-foreground">
                  Today's result
                </p>

                <p
                  className={`mt-1 text-3xl font-bold ${getResultColor(
                    todayEntry.result
                  )}`}
                >
                  {formatResult(
                    todayEntry.result
                  )}
                </p>

                <p className="mt-2 text-sm text-muted-foreground">
                  {todayEntry.result >
                  0
                    ? `You saved ₹${todayEntry.result} compared with today's limit.`
                    : todayEntry.result <
                        0
                      ? `You overspent by ₹${Math.abs(
                          todayEntry.result
                        )} today.`
                      : "You spent exactly your daily limit."}
                </p>

              </div>
            </div>
          )}

        </section>

        {/* BUDGET INFORMATION */}
        <section className="mt-6 rounded-xl border bg-background p-6">

          <h2 className="text-xl font-semibold">
            Budget Information
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">

            <div>
              <p className="text-sm text-muted-foreground">
                Starting daily limit
              </p>

              <p className="mt-1 font-semibold">
                ₹
                {
                  budget.initialDailyLimit
                }
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Budget started
              </p>

              <p className="mt-1 font-semibold">
                {new Date(
                  budget.startDate
                ).toLocaleDateString(
                  "en-IN",
                  {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }
                )}
              </p>
            </div>

          </div>
        </section>

      </div>
    </main>
  );
}
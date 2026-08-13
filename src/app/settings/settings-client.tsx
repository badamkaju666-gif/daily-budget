"use client";

import {
  FormEvent,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createBudgetChange } from "@/actions/budget-change";

type Props = {
  currentDailyLimit: number;
  today: string;
};

export default function BudgetSettingsClient({
  currentDailyLimit,
  today,
}: Props) {
  const router = useRouter();

  const [dailyLimit, setDailyLimit] =
    useState(
      String(currentDailyLimit)
    );

  const [effectiveDate, setEffectiveDate] =
    useState(today);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const limit =
      Number(dailyLimit);

    if (
      !Number.isInteger(limit) ||
      limit <= 0
    ) {
      setError(
        "Enter a valid daily limit."
      );

      return;
    }

    if (!effectiveDate) {
      setError(
        "Select an effective date."
      );

      return;
    }

    setSaving(true);

    const formData =
      new FormData();

    formData.append(
      "dailyLimit",
      dailyLimit
    );

    formData.append(
      "effectiveDate",
      effectiveDate
    );

    try {
      await createBudgetChange(
        formData
      );

      setSuccess(
        `Your daily limit is now ₹${limit} from ${new Date(
          `${effectiveDate}T00:00:00`
        ).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}.`
      );

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to change your daily limit."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border bg-background p-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Current daily limit
        </p>

        <p className="mt-1 text-4xl font-bold">
          ₹{currentDailyLimit}
          <span className="ml-2 text-base font-normal text-muted-foreground">
            / day
          </span>
        </p>
      </div>

      <div className="my-6 border-t" />

      <h2 className="text-xl font-semibold">
        Change Daily Limit
      </h2>

      <p className="mt-1 text-sm text-muted-foreground">
        The new limit will continue until you change it again.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-6"
      >
        <div>
          <label
            htmlFor="dailyLimit"
            className="text-sm font-medium"
          >
            New daily limit
          </label>

          <div className="relative mt-2">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              ₹
            </span>

            <input
              id="dailyLimit"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={dailyLimit}
              onChange={(event) =>
                setDailyLimit(
                  event.target.value
                )
              }
              className="w-full rounded-lg border bg-background py-3 pl-9 pr-4 text-lg outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="effectiveDate"
            className="text-sm font-medium"
          >
            Starts from
          </label>

          <input
            id="effectiveDate"
            type="date"
            min={today}
            value={effectiveDate}
            onChange={(event) =>
              setEffectiveDate(
                event.target.value
              )
            }
            className="mt-2 w-full rounded-lg border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-black"
          />

          <p className="mt-2 text-xs text-muted-foreground">
            You can change it starting today or a future date.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-black px-5 py-3 font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : "Save New Daily Limit"}
        </button>
      </form>
    </section>
  );
}
"use client";

import {
  FormEvent,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { saveDailyEntry } from "@/actions/daily-entry";

type Props = {
  date: string;
  dailyLimit: number;
  existingAmount: number | null;
};

export default function EditDailyEntry({
  date,
  dailyLimit,
  existingAmount,
}: Props) {
  const router = useRouter();

  const [amount, setAmount] =
    useState(
      existingAmount !== null
        ? String(existingAmount)
        : ""
    );

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const numericAmount =
      Number(amount);

    if (
      !Number.isInteger(numericAmount) ||
      numericAmount < 0
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
      String(numericAmount)
    );

    formData.append(
      "date",
      date
    );

    try {
      const result =
        await saveDailyEntry(
          formData
        );

      /*
       * The server has already revalidated
       * History and Dashboard.
       */
      if (result.success) {
        router.push("/history");
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to save this entry."
      );

      setSaving(false);
    }
  }

  const previewResult =
    amount === ""
      ? null
      : dailyLimit -
        Number(amount);

  return (
    <>
      <div>
        <p className="text-sm text-muted-foreground">
          Daily limit
        </p>

        <p className="mt-1 text-2xl font-bold">
          ₹{dailyLimit}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-6"
      >
        <label
          htmlFor="amount"
          className="text-sm font-medium"
        >
          How much did you spend?
        </label>

        <input
          id="amount"
          name="amountSpent"
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={amount}
          onChange={(event) =>
            setAmount(
              event.target.value
            )
          }
          placeholder="0"
          className="mt-2 w-full rounded-lg border bg-background px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-black"
        />

        {previewResult !== null && (
          <div className="mt-5 rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              New result
            </p>

            <p
              className={`mt-1 text-2xl font-bold ${
                previewResult > 0
                  ? "text-green-600"
                  : previewResult < 0
                    ? "text-red-600"
                    : "text-foreground"
              }`}
            >
              {previewResult > 0
                ? `+₹${previewResult}`
                : previewResult < 0
                  ? `-₹${Math.abs(
                      previewResult
                    )}`
                  : "₹0"}
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">
              {error}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-6 w-full rounded-lg bg-black px-5 py-3 font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : existingAmount !== null
              ? "Update Spending"
              : "Save Spending"}
        </button>
      </form>
    </>
  );
}
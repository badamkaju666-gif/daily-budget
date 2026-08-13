"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteBudgetChange } from "@/actions/budget-change";

type Props = {
  changeId: string;
};

export default function DeleteButtonClient({
  changeId,
}: Props) {
  const router = useRouter();

  const [deleting, setDeleting] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleDelete() {
    const confirmed =
      window.confirm(
        "Delete this future budget change?"
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setDeleting(true);

    try {
      await deleteBudgetChange(
        changeId
      );

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to delete the budget change."
      );

      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {deleting
          ? "Deleting..."
          : "Delete"}
      </button>

      {error && (
        <p className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
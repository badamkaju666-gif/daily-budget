"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  dateStringToUtcDate,
  getDateStringInTimezone,
  utcDateToDateString,
} from "@/lib/date";

export async function saveDailyEntry(
  formData: FormData
) {
  const session =
    await auth.api.getSession({
      headers: await headers(),
    });

  if (!session) {
    redirect("/login");
  }

  const amountSpentValue =
    formData.get("amountSpent");

  const dateValue =
    formData.get("date");

  if (
    typeof amountSpentValue !== "string" ||
    typeof dateValue !== "string"
  ) {
    throw new Error(
      "Invalid spending information."
    );
  }

  const amountSpent =
    Number(amountSpentValue);

  if (
    !Number.isInteger(amountSpent) ||
    amountSpent < 0
  ) {
    throw new Error(
      "Amount spent must be a whole number of ₹0 or more."
    );
  }

  const date =
    dateStringToUtcDate(dateValue);

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

  const today =
    dateStringToUtcDate(todayString);

  /*
   * Treat the budget start as a calendar date,
   * not as the exact timestamp stored in PostgreSQL.
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
   * Future dates are not allowed.
   */
  if (date > today) {
    throw new Error(
      "You cannot add spending for a future date."
    );
  }

  /*
   * Dates before the budget started are not allowed.
   */
  if (date < budgetStartDate) {
    throw new Error(
      "You cannot add a spending entry before your budget started."
    );
  }

  /*
   * Find the daily limit that applied
   * on this exact date.
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
    latestChange?.dailyLimit ??
    budget.initialDailyLimit;

  /*
   * Calculate the result again every time.
   *
   * Example:
   *
   * Limit  = ₹100
   * Spent  = ₹100
   * Result = ₹0
   *
   * Limit  = ₹100
   * Spent  = ₹70
   * Result = +₹30
   *
   * Limit  = ₹100
   * Spent  = ₹120
   * Result = -₹20
   */
  const result =
    dailyLimit - amountSpent;

  let status:
    | "SAVED"
    | "SPENT"
    | "OVERSPENT";

  if (result > 0) {
    status = "SAVED";
  } else if (result === 0) {
    status = "SPENT";
  } else {
    status = "OVERSPENT";
  }

  /*
   * Create or UPDATE the complete daily entry.
   *
   * Notice that result, dailyLimit and status
   * are all updated too.
   */
  await prisma.dailyEntry.upsert({
    where: {
      budgetId_date: {
        budgetId: budget.id,
        date,
      },
    },

    create: {
      budgetId: budget.id,
      date,
      amountSpent,
      dailyLimit,
      result,
      status,
    },

    update: {
      amountSpent,
      dailyLimit,
      result,
      status,
    },
  });

  /*
   * IMPORTANT:
   *
   * History and Dashboard are server-rendered pages.
   * Explicitly invalidate them so they immediately
   * read the newly updated DailyEntry.
   */
  revalidatePath("/history");
  revalidatePath("/dashboard");

  /*
   * Also invalidate the individual history route.
   */
  revalidatePath(
    `/history/${dateValue}`
  );

  return {
    success: true,
    amountSpent,
    dailyLimit,
    result,
    status,
  };
}
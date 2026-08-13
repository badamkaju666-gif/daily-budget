"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  dateStringToUtcDate,
  getDateStringInTimezone,
} from "@/lib/date";

export async function createBudgetChange(
  formData: FormData
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const dailyLimitValue =
    formData.get("dailyLimit");

  const effectiveDateValue =
    formData.get("effectiveDate");

  if (
    typeof dailyLimitValue !== "string" ||
    typeof effectiveDateValue !== "string"
  ) {
    throw new Error(
      "Invalid budget change information."
    );
  }

  const dailyLimit =
    Number(dailyLimitValue);

  if (
    !Number.isInteger(dailyLimit) ||
    dailyLimit <= 0
  ) {
    throw new Error(
      "Daily limit must be a positive whole number."
    );
  }

  const effectiveDate =
    dateStringToUtcDate(
      effectiveDateValue
    );

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

  if (effectiveDate < budget.startDate) {
    throw new Error(
      "The new limit cannot start before your budget started."
    );
  }

  if (effectiveDate < today) {
    throw new Error(
      "A budget change cannot start in the past."
    );
  }

  const existingChange =
    await prisma.budgetChange.findFirst({
      where: {
        budgetId: budget.id,
        effectiveDate,
      },
    });

  const isToday =
    effectiveDate.getTime() ===
    today.getTime();

  /*
   * TODAY
   *
   * Changing today's limit immediately changes
   * today's available balance.
   */
  if (isToday) {
    const previousChange =
      await prisma.budgetChange.findFirst({
        where: {
          budgetId: budget.id,
          effectiveDate: {
            lt: today,
          },
        },
        orderBy: {
          effectiveDate: "desc",
        },
      });

    const oldDailyLimit =
      existingChange?.dailyLimit ??
      previousChange?.dailyLimit ??
      budget.initialDailyLimit;

    /*
     * Save the new limit.
     */
    if (existingChange) {
      await prisma.budgetChange.update({
        where: {
          id: existingChange.id,
        },
        data: {
          dailyLimit,
        },
      });
    } else {
      await prisma.budgetChange.create({
        data: {
          budgetId: budget.id,
          effectiveDate,
          dailyLimit,
        },
      });
    }

    /*
     * If today's spending already exists,
     * recalculate today's result.
     */
    const todayEntry =
      await prisma.dailyEntry.findUnique({
        where: {
          budgetId_date: {
            budgetId: budget.id,
            date: today,
          },
        },
      });

    if (todayEntry) {
      const newResult =
        dailyLimit -
        todayEntry.amountSpent;

      let status:
        | "SAVED"
        | "SPENT"
        | "OVERSPENT";

      if (newResult > 0) {
        status = "SAVED";
      } else if (newResult === 0) {
        status = "SPENT";
      } else {
        status = "OVERSPENT";
      }

      await prisma.dailyEntry.update({
        where: {
          id: todayEntry.id,
        },
        data: {
          dailyLimit,
          result: newResult,
          status,
        },
      });
    }

    return {
      success: true,
      oldDailyLimit,
      newDailyLimit: dailyLimit,
      effectiveDate: effectiveDateValue,
    };
  }

  /*
   * FUTURE DATE
   *
   * A future change does not affect today's
   * balance.
   */
  if (existingChange) {
    await prisma.budgetChange.update({
      where: {
        id: existingChange.id,
      },
      data: {
        dailyLimit,
      },
    });
  } else {
    await prisma.budgetChange.create({
      data: {
        budgetId: budget.id,
        effectiveDate,
        dailyLimit,
      },
    });
  }

  return {
    success: true,
    oldDailyLimit: existingChange?.dailyLimit ?? null,
    newDailyLimit: dailyLimit,
    effectiveDate: effectiveDateValue,
  };
}

/*
 * Delete a future budget change.
 */
export async function deleteBudgetChange(
  changeId: string
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Not authenticated.");
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
    throw new Error("Budget not found.");
  }

  const change =
    await prisma.budgetChange.findFirst({
      where: {
        id: changeId,
        budgetId: budget.id,
      },
    });

  if (!change) {
    throw new Error(
      "Budget change not found."
    );
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
   * We only allow deleting future changes.
   *
   * Today's active limit should be changed using
   * the settings form instead.
   */
  if (change.effectiveDate <= today) {
    throw new Error(
      "Only future budget changes can be deleted."
    );
  }

  await prisma.budgetChange.delete({
    where: {
      id: change.id,
    },
  });

  return {
    success: true,
  };
}
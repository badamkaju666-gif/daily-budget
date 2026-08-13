"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function createBudget(formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const dailyLimitValue = formData.get("dailyLimit");
  const startDateValue = formData.get("startDate");

  if (
    typeof dailyLimitValue !== "string" ||
    typeof startDateValue !== "string"
  ) {
    throw new Error("Invalid budget information.");
  }

  const dailyLimit = Number(dailyLimitValue);

  if (!Number.isInteger(dailyLimit) || dailyLimit <= 0) {
    throw new Error("Daily limit must be a positive whole number.");
  }

  if (!startDateValue) {
    throw new Error("Start date is required.");
  }

  const startDate = new Date(`${startDateValue}T00:00:00`);

  if (Number.isNaN(startDate.getTime())) {
    throw new Error("Invalid start date.");
  }

  const existingBudget = await prisma.budget.findFirst({
    where: {
      userId: session.user.id,
    },
  });

  if (existingBudget) {
    throw new Error("You already have a budget.");
  }

  await prisma.budget.create({
    data: {
      userId: session.user.id,
      startDate,
      initialDailyLimit: dailyLimit,
    },
  });

  redirect("/dashboard");
}
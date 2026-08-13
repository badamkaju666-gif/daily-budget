"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidTimezone } from "@/lib/date";

export async function updateUserTimezone(
  timezone: string
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Not authenticated.");
  }

  if (!isValidTimezone(timezone)) {
    throw new Error("Invalid timezone.");
  }

  await prisma.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      timezone,
    },
  });
}
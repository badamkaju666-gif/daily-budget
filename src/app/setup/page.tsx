import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBudget } from "@/actions/budget";

export default async function SetupPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const existingBudget = await prisma.budget.findFirst({
    where: {
      userId: session.user.id,
    },
  });

  if (existingBudget) {
    redirect("/dashboard");
  }

  const today = new Date();
  const todayString = today.toISOString().split("T")[0];

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <p className="text-sm font-medium text-muted-foreground">
            DAILY BUDGET
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Set your daily budget
          </h1>

          <p className="mt-2 text-muted-foreground">
            Start with the amount you can afford to spend each day.
            You can change it later.
          </p>
        </div>

        <form action={createBudget} className="space-y-6">
          <div>
            <label
              htmlFor="dailyLimit"
              className="text-sm font-medium"
            >
              Daily spending limit
            </label>

            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                ₹
              </span>

              <input
                id="dailyLimit"
                name="dailyLimit"
                type="number"
                min="1"
                step="1"
                required
                placeholder="100"
                className="w-full rounded-lg border bg-background py-3 pl-9 pr-4 text-lg outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              Example: ₹100 means you can spend up to ₹100 each day.
            </p>
          </div>

          <div>
            <label
              htmlFor="startDate"
              className="text-sm font-medium"
            >
              Budget starts from
            </label>

            <input
              id="startDate"
              name="startDate"
              type="date"
              defaultValue={todayString}
              required
              className="mt-2 w-full rounded-lg border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-black"
            />

            <p className="mt-2 text-xs text-muted-foreground">
              You can start from today or choose an earlier date.
            </p>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-black px-5 py-3 font-medium text-white transition hover:bg-black/80"
          >
            Start my budget
          </button>
        </form>
      </div>
    </main>
  );
}
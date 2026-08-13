import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-medium text-muted-foreground">
            DAILY BUDGET
          </p>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Spend less.
            <br />
            Keep the difference.
          </h1>

          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Set your daily budget, record what you actually spend, and watch
            your savings balance grow day by day.
          </p>

          <div className="mt-8 flex gap-4">
            <Link
              href="/signup"
              className="rounded-lg bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-black/80"
            >
              Get started
            </Link>

            <Link
              href="/login"
              className="rounded-lg border px-5 py-3 text-sm font-medium transition hover:bg-muted"
            >
              Login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
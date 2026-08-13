"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export default function ThemeToggle() {
  const [theme, setTheme] =
    useState<Theme>("light");

  const [mounted, setMounted] =
    useState(false);

  useEffect(() => {
    const savedTheme =
      localStorage.getItem(
        "daily-budget-theme"
      ) as Theme | null;

    const initialTheme =
      savedTheme === "dark"
        ? "dark"
        : "light";

    setTheme(initialTheme);

    document.documentElement.classList.toggle(
      "dark",
      initialTheme === "dark"
    );

    setMounted(true);
  }, []);

  function toggleTheme() {
    const nextTheme =
      theme === "dark"
        ? "light"
        : "dark";

    setTheme(nextTheme);

    document.documentElement.classList.toggle(
      "dark",
      nextTheme === "dark"
    );

    localStorage.setItem(
      "daily-budget-theme",
      nextTheme
    );
  }

  /*
   * Avoid rendering different content
   * before the browser has loaded the
   * saved preference.
   */
  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Change theme"
        className="rounded-lg border bg-background px-3 py-2 text-sm font-medium"
      >
        Theme
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded-lg border bg-background px-3 py-2 text-sm font-medium transition hover:bg-muted"
      aria-label={
        theme === "dark"
          ? "Switch to light mode"
          : "Switch to dark mode"
      }
    >
      {theme === "dark"
        ? "☀️ Light"
        : "🌙 Dark"}
    </button>
  );
}
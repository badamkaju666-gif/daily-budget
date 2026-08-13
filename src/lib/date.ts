export function getDateStringInTimezone(
  timezone: string,
  date = new Date()
) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

export function dateStringToUtcDate(
  dateString: string
) {
  const date = new Date(`${dateString}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date.");
  }

  return date;
}

export function utcDateToDateString(
  date: Date
) {
  return date.toISOString().split("T")[0];
}

export function addDays(
  dateString: string,
  days: number
) {
  const date = new Date(`${dateString}T00:00:00.000Z`);

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().split("T")[0];
}

export function isValidTimezone(
  timezone: string
) {
  try {
    Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
    });

    return true;
  } catch {
    return false;
  }
}
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function startOfDayUtc(input: Date | string) {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function dateToIsoDay(input: Date | string) {
  return startOfDayUtc(input).toISOString().slice(0, 10);
}

export function addDays(input: Date, days: number) {
  return new Date(startOfDayUtc(input).getTime() + days * ONE_DAY_MS);
}

export function daysBetween(start: Date, end: Date) {
  return Math.round((startOfDayUtc(end).getTime() - startOfDayUtc(start).getTime()) / ONE_DAY_MS);
}

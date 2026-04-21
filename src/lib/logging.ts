type LogLevel = "info" | "warn" | "error";

export function logEvent(level: LogLevel, event: string, payload: Record<string, unknown> = {}) {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...payload,
  };

  const line = JSON.stringify(record);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

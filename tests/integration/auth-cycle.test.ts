import fs from "fs";
import path from "path";

import { beforeAll, beforeEach, describe, expect, it } from "vitest";

const testDbPath = path.join(process.cwd(), "prisma", "integration.db");
process.env.DATABASE_URL = `file:${testDbPath}`;

let prisma: typeof import("@/lib/prisma").prisma;
let registerSingleUser: typeof import("@/lib/auth").registerSingleUser;
let createCycle: typeof import("@/lib/cycle").createCycle;
let upsertDailyObservation: typeof import("@/lib/cycle").upsertDailyObservation;
let recomputeCycle: typeof import("@/lib/cycle").recomputeCycle;
let ensureUserSettings: typeof import("@/lib/cycle").ensureUserSettings;

beforeAll(async () => {
  try {
    fs.unlinkSync(testDbPath);
  } catch {
    // no-op
  }

  const { execSync } = await import("child_process");
  execSync("./node_modules/.bin/prisma db push --skip-generate", {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL,
    },
    stdio: "pipe",
  });

  ({ prisma } = await import("@/lib/prisma"));
  ({ registerSingleUser } = await import("@/lib/auth"));
  ({ createCycle, upsertDailyObservation, recomputeCycle, ensureUserSettings } = await import("@/lib/cycle"));
});

beforeEach(async () => {
  await prisma.overrideDay.deleteMany();
  await prisma.interpretationDay.deleteMany();
  await prisma.dailyObservation.deleteMany();
  await prisma.cycle.deleteMany();
  await prisma.session.deleteMany();
  await prisma.userSettings.deleteMany();
  await prisma.user.deleteMany();
});

describe("auth + cycle flow", () => {
  it("allows first registration only", async () => {
    await registerSingleUser("owner@example.com", "very-secure-password");
    await expect(registerSingleUser("second@example.com", "very-secure-password")).rejects.toThrow(
      "Registration is closed",
    );
  });

  it("recomputes interpretation after observation writes", async () => {
    const user = await registerSingleUser("owner@example.com", "very-secure-password");
    await ensureUserSettings(user.id);

    const cycle = await createCycle(user.id, new Date("2026-03-01"));

    await upsertDailyObservation({
      userId: user.id,
      cycleId: cycle.id,
      date: new Date("2026-03-01"),
      bbtUnit: "C",
      bbtValue: null,
      mucusStretch: 0,
      mucusTransparency: "X",
      mucusSlipperiness: "X",
      mostFertileFrequency: "NONE",
      cervixPosition: "low",
      bleedingLevel: 2,
      intercourse: false,
      notes: "day 1",
    });

    await upsertDailyObservation({
      userId: user.id,
      cycleId: cycle.id,
      date: new Date("2026-03-02"),
      bbtUnit: "C",
      bbtValue: null,
      mucusStretch: 10,
      mucusTransparency: "K",
      mucusSlipperiness: "L",
      mostFertileFrequency: "AD",
      cervixPosition: "high",
      bleedingLevel: 1,
      intercourse: true,
      notes: "day 2",
    });

    await recomputeCycle(cycle.id, user.id);

    const interpretations = await prisma.interpretationDay.findMany({ where: { cycleId: cycle.id } });
    expect(interpretations.length).toBe(2);
  });
});

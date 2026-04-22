import fs from "fs";
import path from "path";

import { PrismaClient } from "@prisma/client";

function loadEnvFileIfNeeded() {
  if (process.env.DATABASE_URL) {
    return;
  }

  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const idx = line.indexOf("=");
    if (idx <= 0) {
      continue;
    }

    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function deriveDatabaseUrlFromSqliteFilePath() {
  if (process.env.DATABASE_URL) {
    return;
  }

  const sqliteFilePath = process.env.SQLITE_FILE_PATH?.trim();
  if (!sqliteFilePath) {
    return;
  }

  process.env.DATABASE_URL = sqliteFilePath.startsWith("file:")
    ? sqliteFilePath
    : `file:${sqliteFilePath}`;
}

function toUtcDate(isoDay) {
  const [year, month, day] = isoDay.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function isoDayFromDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function normalizeCreightonEntry(entry) {
  const bleedingLevel = entry.bleedingLevel ?? 0;
  const suppressMucusScoring = bleedingLevel >= 3;
  const mucusStretch = suppressMucusScoring ? 0 : (entry.mucusStretch ?? 0);
  const mucusTransparency =
    suppressMucusScoring || mucusStretch === 2 ? "X" : (entry.mucusTransparency ?? "X");
  const mucusSlipperiness = suppressMucusScoring ? "X" : (entry.mucusSlipperiness ?? "X");
  const mostFertileFrequency = suppressMucusScoring ? "NONE" : (entry.mostFertileFrequency ?? "NONE");

  return {
    bleedingLevel,
    mucusStretch,
    mucusTransparency,
    mucusSlipperiness,
    mostFertileFrequency,
    intercourse: Boolean(entry.intercourse),
    cervixPosition: "unknown",
    notes: "",
  };
}

function buildCreightonSeedEntries(startDate, pattern) {
  return pattern.map((rawEntry, index) => {
    const entry = normalizeCreightonEntry(rawEntry);
    const date = addDays(startDate, index);
    return {
      date,
      cycleDay: index + 1,
      bbtCelsius: null,
      mucusStretch: entry.mucusStretch,
      mucusTransparency: entry.mucusTransparency,
      mucusSlipperiness: entry.mucusSlipperiness,
      mostFertileFrequency: entry.mostFertileFrequency,
      cervixPosition: entry.cervixPosition,
      bleedingLevel: entry.bleedingLevel,
      intercourse: entry.intercourse,
      notes: entry.notes,
    };
  });
}

const CYCLE_ONE_PATTERN = [
  { bleedingLevel: 4 },
  { bleedingLevel: 3 },
  { bleedingLevel: 2 },
  { bleedingLevel: 1 },
  { bleedingLevel: 0, mucusStretch: 0, intercourse: true },
  { bleedingLevel: 0, mucusStretch: 2, mucusSlipperiness: "N", mostFertileFrequency: "ONE" },
  { bleedingLevel: 0, mucusStretch: 2, mucusSlipperiness: "N", mostFertileFrequency: "TWO" },
  { bleedingLevel: 0, mucusStretch: 6, mucusTransparency: "C", mucusSlipperiness: "N", mostFertileFrequency: "TWO" },
  { bleedingLevel: 0, mucusStretch: 8, mucusTransparency: "C", mucusSlipperiness: "N", mostFertileFrequency: "THREE" },
  { bleedingLevel: 0, mucusStretch: 8, mucusTransparency: "K", mucusSlipperiness: "N", mostFertileFrequency: "THREE", intercourse: true },
  { bleedingLevel: 0, mucusStretch: 10, mucusTransparency: "K", mucusSlipperiness: "L", mostFertileFrequency: "AD" },
  { bleedingLevel: 0, mucusStretch: 10, mucusTransparency: "K", mucusSlipperiness: "L", mostFertileFrequency: "AD" },
  { bleedingLevel: 0, mucusStretch: 6, mucusTransparency: "C", mucusSlipperiness: "N", mostFertileFrequency: "TWO" },
  { bleedingLevel: 0, mucusStretch: 2, mucusSlipperiness: "N", mostFertileFrequency: "ONE" },
  { bleedingLevel: 0, mucusStretch: 0 },
  { bleedingLevel: 0, mucusStretch: 0, intercourse: true },
  { bleedingLevel: 0, mucusStretch: 0 },
  { bleedingLevel: 0, mucusStretch: 0 },
  { bleedingLevel: 0, mucusStretch: 0 },
  { bleedingLevel: 0, mucusStretch: 0, intercourse: true },
  { bleedingLevel: 0, mucusStretch: 0 },
  { bleedingLevel: 0, mucusStretch: 0 },
  { bleedingLevel: 0, mucusStretch: 0 },
  { bleedingLevel: 0, mucusStretch: 0 },
  { bleedingLevel: 0, mucusStretch: 0 },
  { bleedingLevel: 0, mucusStretch: 0 },
  { bleedingLevel: 0, mucusStretch: 0 },
  { bleedingLevel: 0, mucusStretch: 0 },
  { bleedingLevel: 0, mucusStretch: 0 },
];

const CYCLE_TWO_PATTERN = [
  { bleedingLevel: 4 },
  { bleedingLevel: 3 },
  { bleedingLevel: 2 },
  { bleedingLevel: 1 },
  { bleedingLevel: 0, mucusStretch: 0 },
  { bleedingLevel: 0, mucusStretch: 2, mucusSlipperiness: "N", mostFertileFrequency: "ONE", intercourse: true },
  { bleedingLevel: 0, mucusStretch: 6, mucusTransparency: "C", mucusSlipperiness: "N", mostFertileFrequency: "TWO" },
  { bleedingLevel: 0, mucusStretch: 6, mucusTransparency: "K", mucusSlipperiness: "N", mostFertileFrequency: "THREE" },
  { bleedingLevel: 0, mucusStretch: 8, mucusTransparency: "K", mucusSlipperiness: "L", mostFertileFrequency: "AD" },
  { bleedingLevel: 0, mucusStretch: 10, mucusTransparency: "K", mucusSlipperiness: "L", mostFertileFrequency: "AD" },
  { bleedingLevel: 0, mucusStretch: 8, mucusTransparency: "K", mucusSlipperiness: "N", mostFertileFrequency: "THREE", intercourse: true },
  { bleedingLevel: 0, mucusStretch: 6, mucusTransparency: "C", mucusSlipperiness: "N", mostFertileFrequency: "TWO" },
  { bleedingLevel: 0, mucusStretch: 2, mucusSlipperiness: "N", mostFertileFrequency: "ONE" },
  { bleedingLevel: 0, mucusStretch: 0 },
  { bleedingLevel: 0, mucusStretch: 0 },
  { bleedingLevel: 0, mucusStretch: 0 },
  { bleedingLevel: 0, mucusStretch: 0, intercourse: true },
  { bleedingLevel: 0, mucusStretch: 0 },
  { bleedingLevel: 0, mucusStretch: 0 },
  { bleedingLevel: 0, mucusStretch: 0 },
  { bleedingLevel: 0, mucusStretch: 0 },
  { bleedingLevel: 0, mucusStretch: 0 },
  { bleedingLevel: 0, mucusStretch: 0 },
  { bleedingLevel: 0, mucusStretch: 0 },
  { bleedingLevel: 0, mucusStretch: 0 },
  { bleedingLevel: 0, mucusStretch: 0 },
  { bleedingLevel: 0, mucusStretch: 0 },
  { bleedingLevel: 0, mucusStretch: 0 },
  { bleedingLevel: 0, mucusStretch: 0 },
];

async function main() {
  loadEnvFileIfNeeded();
  deriveDatabaseUrlFromSqliteFilePath();

  const prisma = new PrismaClient();

  const targetEmail = process.env.SEED_EMAIL?.toLowerCase();
  const user = targetEmail
    ? await prisma.user.findUnique({ where: { email: targetEmail } })
    : await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });

  if (!user) {
    throw new Error("No user found. Run account seed first (`npm run seed:account`).");
  }

  await prisma.cycle.deleteMany({ where: { userId: user.id } });

  const cycleTwoStart = toUtcDate(isoDayFromDate(addDays(new Date(), -28)));
  const cycleOneStart = addDays(cycleTwoStart, -29);
  const cycleOneEnd = addDays(cycleOneStart, CYCLE_ONE_PATTERN.length - 1);

  const cycleOne = await prisma.cycle.create({
    data: {
      userId: user.id,
      startDate: cycleOneStart,
      endDate: cycleOneEnd,
      isActive: false,
    },
  });

  const cycleTwo = await prisma.cycle.create({
    data: {
      userId: user.id,
      startDate: cycleTwoStart,
      isActive: true,
    },
  });

  const cycleOneEntries = buildCreightonSeedEntries(cycleOneStart, CYCLE_ONE_PATTERN);
  const cycleTwoEntries = buildCreightonSeedEntries(cycleTwoStart, CYCLE_TWO_PATTERN);

  await prisma.dailyObservation.createMany({
    data: cycleOneEntries.map((e) => ({
      cycleId: cycleOne.id,
      date: e.date,
      cycleDay: e.cycleDay,
      bbtCelsius: e.bbtCelsius,
      mucusStretch: e.mucusStretch,
      mucusTransparency: e.mucusTransparency,
      mucusSlipperiness: e.mucusSlipperiness,
      mostFertileFrequency: e.mostFertileFrequency,
      cervixPosition: e.cervixPosition,
      bleedingLevel: e.bleedingLevel,
      intercourse: e.intercourse,
      notes: e.notes,
    })),
  });

  await prisma.dailyObservation.createMany({
    data: cycleTwoEntries.map((e) => ({
      cycleId: cycleTwo.id,
      date: e.date,
      cycleDay: e.cycleDay,
      bbtCelsius: e.bbtCelsius,
      mucusStretch: e.mucusStretch,
      mucusTransparency: e.mucusTransparency,
      mucusSlipperiness: e.mucusSlipperiness,
      mostFertileFrequency: e.mostFertileFrequency,
      cervixPosition: e.cervixPosition,
      bleedingLevel: e.bleedingLevel,
      intercourse: e.intercourse,
      notes: e.notes,
    })),
  });

  await prisma.$disconnect();

  console.log("Creighton data seed complete.");
  console.log(`User: ${user.email}`);
  console.log(`Cycle 1 start/end: ${isoDayFromDate(cycleOneStart)} -> ${isoDayFromDate(cycleOneEnd)}`);
  console.log(`Cycle 2 start: ${isoDayFromDate(cycleTwoStart)} (active)`);
  console.log("Rules applied: damp(2) ignores transparency; M/H bleeding suppresses mucus scoring.");
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});

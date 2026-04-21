import { Prisma, type FertilityStatus } from "@prisma/client";

import { dateToIsoDay, daysBetween, startOfDayUtc } from "@/lib/dates";
import { ApiError } from "@/lib/errors";
import { computeInterpretation } from "@/lib/interpretation";
import { logEvent } from "@/lib/logging";
import { prisma } from "@/lib/prisma";
import { normalizeBbtToCelsius } from "@/lib/temperature";
import type {
  BbtUnit,
  CervixPosition,
  MostFertileFrequency,
  MucusSlipperiness,
  MucusStretch,
  MucusTransparency,
} from "@/types/contracts";

export async function ensureUserSettings(userId: string) {
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  if (settings) {
    return settings;
  }

  return prisma.userSettings.create({
    data: {
      userId,
    },
  });
}

function mapCycle(cycle: {
  id: string;
  startDate: Date;
  endDate: Date | null;
  isActive: boolean;
  interpretationStale: boolean;
  interpretationStaleReason: string | null;
  days: Array<{
    date: Date;
    cycleDay: number | null;
    bbtCelsius: number | null;
    mucusStretch: MucusStretch;
    mucusTransparency: MucusTransparency;
    mucusSlipperiness: MucusSlipperiness;
    mostFertileFrequency: MostFertileFrequency;
    cervixPosition: CervixPosition;
    bleedingLevel: number;
    intercourse: boolean;
    notes: string | null;
  }>;
  interpretations: Array<{
    date: Date;
    status: FertilityStatus;
    ruleTrace: Prisma.JsonValue;
    reasonCodes: Prisma.JsonValue;
  }>;
  overrides: Array<{
    date: Date;
    overriddenStatus: FertilityStatus;
    reason: string;
    overriddenAt: Date;
  }>;
}) {
  const interpretationByDate = new Map(
    cycle.interpretations.map((item) => [
      dateToIsoDay(item.date),
      {
        status: item.status,
        ruleTrace: (item.ruleTrace as string[]) ?? [],
        reasonCodes: (item.reasonCodes as string[]) ?? [],
      },
    ]),
  );

  const overrideByDate = new Map(
    cycle.overrides.map((item) => [
      dateToIsoDay(item.date),
      {
        status: item.overriddenStatus,
        reason: item.reason,
        overriddenAt: item.overriddenAt,
      },
    ]),
  );

  return {
    id: cycle.id,
    startDate: dateToIsoDay(cycle.startDate),
    endDate: cycle.endDate ? dateToIsoDay(cycle.endDate) : null,
    isActive: cycle.isActive,
    interpretationStale: cycle.interpretationStale,
    interpretationStaleReason: cycle.interpretationStaleReason,
    days: cycle.days
      .slice()
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((day) => {
        const key = dateToIsoDay(day.date);
        const interpretation = interpretationByDate.get(key);
        const override = overrideByDate.get(key);

        return {
          date: key,
          cycleDay: day.cycleDay,
          bbtCelsius: day.bbtCelsius,
          mucusStretch: day.mucusStretch,
          mucusTransparency: day.mucusTransparency,
          mucusSlipperiness: day.mucusSlipperiness,
          mostFertileFrequency: day.mostFertileFrequency,
          cervixPosition: day.cervixPosition,
          bleedingLevel: day.bleedingLevel,
          intercourse: day.intercourse,
          notes: day.notes,
          autoStatus: interpretation?.status ?? "uncertain",
          status: override?.status ?? interpretation?.status ?? "uncertain",
          triggeredRules: interpretation?.ruleTrace ?? [],
          reasonCodes: interpretation?.reasonCodes ?? [],
          override: override
            ? {
                status: override.status,
                reason: override.reason,
                overriddenAt: override.overriddenAt.toISOString(),
              }
            : null,
        };
      }),
  };
}

export async function getCurrentCycle(userId: string) {
  const cycle = await prisma.cycle.findFirst({
    where: { userId, isActive: true },
    include: {
      days: true,
      interpretations: true,
      overrides: true,
    },
    orderBy: { startDate: "desc" },
  });

  if (!cycle) {
    return null;
  }

  return mapCycle(cycle);
}

export async function listCycles(userId: string) {
  const cycles = await prisma.cycle.findMany({
    where: { userId },
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      isActive: true,
      _count: {
        select: {
          days: true,
        },
      },
    },
  });

  return cycles.map((cycle) => ({
    id: cycle.id,
    startDate: dateToIsoDay(cycle.startDate),
    endDate: cycle.endDate ? dateToIsoDay(cycle.endDate) : null,
    isActive: cycle.isActive,
    dayCount: cycle._count.days,
  }));
}

export async function getCycle(userId: string, cycleId: string) {
  const cycle = await prisma.cycle.findFirst({
    where: { userId, id: cycleId },
    include: {
      days: true,
      interpretations: true,
      overrides: true,
    },
  });

  if (!cycle) {
    return null;
  }

  return mapCycle(cycle);
}

function rangesOverlap(params: {
  aStart: Date;
  aEnd: Date | null;
  bStart: Date;
  bEnd: Date | null;
}) {
  const aStart = startOfDayUtc(params.aStart).getTime();
  const aEnd = params.aEnd ? startOfDayUtc(params.aEnd).getTime() : Number.POSITIVE_INFINITY;
  const bStart = startOfDayUtc(params.bStart).getTime();
  const bEnd = params.bEnd ? startOfDayUtc(params.bEnd).getTime() : Number.POSITIVE_INFINITY;

  return aStart <= bEnd && bStart <= aEnd;
}

async function ensureNoCycleOverlap(params: {
  userId: string;
  startDate: Date;
  endDate: Date | null;
  excludeCycleId?: string;
}) {
  const others = await prisma.cycle.findMany({
    where: {
      userId: params.userId,
      ...(params.excludeCycleId ? { id: { not: params.excludeCycleId } } : {}),
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
    },
  });

  const overlap = others.find((cycle) =>
    rangesOverlap({
      aStart: params.startDate,
      aEnd: params.endDate,
      bStart: cycle.startDate,
      bEnd: cycle.endDate,
    }),
  );

  if (overlap) {
    throw new ApiError(409, "CYCLE_OVERLAP", "Cycle date range overlaps another existing cycle.");
  }
}

export async function createCycle(userId: string, startDate: Date) {
  const normalizedStartDate = startOfDayUtc(startDate);

  const activeCycle = await prisma.cycle.findFirst({
    where: { userId, isActive: true },
  });

  if (activeCycle) {
    throw new ApiError(409, "ACTIVE_CYCLE_EXISTS", "An active cycle already exists. End it before starting a new one.");
  }

  await ensureNoCycleOverlap({
    userId,
    startDate: normalizedStartDate,
    endDate: null,
  });

  const cycle = await prisma.cycle.create({
    data: {
      userId,
      startDate: normalizedStartDate,
      isActive: true,
    },
    include: {
      days: true,
      interpretations: true,
      overrides: true,
    },
  });

  return mapCycle(cycle);
}

export async function updateCycle(
  userId: string,
  cycleId: string,
  payload: {
    startDate?: Date;
    endDate?: Date | null;
    isActive?: boolean;
  },
) {
  const existing = await prisma.cycle.findFirst({ where: { id: cycleId, userId } });
  if (!existing) {
    throw new ApiError(404, "CYCLE_NOT_FOUND", "Cycle not found");
  }

  const normalizedStartDate = payload.startDate ? startOfDayUtc(payload.startDate) : startOfDayUtc(existing.startDate);
  const normalizedEndDate =
    payload.endDate === undefined ? (existing.endDate ? startOfDayUtc(existing.endDate) : null) : payload.endDate ? startOfDayUtc(payload.endDate) : null;
  const nextIsActive = payload.isActive ?? existing.isActive;

  if (normalizedEndDate && normalizedEndDate < normalizedStartDate) {
    throw new ApiError(400, "END_BEFORE_START", "Cycle end date cannot be before start date");
  }

  if (nextIsActive && normalizedEndDate) {
    throw new ApiError(400, "ACTIVE_CYCLE_HAS_END", "Active cycle cannot have an end date.");
  }

  if (!nextIsActive && !normalizedEndDate) {
    throw new ApiError(400, "INACTIVE_CYCLE_NEEDS_END", "Inactive cycle must include an end date.");
  }

  if (nextIsActive) {
    const otherActive = await prisma.cycle.findFirst({
      where: {
        userId,
        isActive: true,
        id: { not: cycleId },
      },
      select: { id: true },
    });
    if (otherActive) {
      throw new ApiError(409, "ACTIVE_CYCLE_EXISTS", "Another active cycle already exists.");
    }
  }

  await ensureNoCycleOverlap({
    userId,
    startDate: normalizedStartDate,
    endDate: normalizedEndDate,
    excludeCycleId: cycleId,
  });

  const outOfRangeCount = await prisma.dailyObservation.count({
    where: {
      cycleId,
      OR: [
        { date: { lt: normalizedStartDate } },
        ...(normalizedEndDate ? [{ date: { gt: normalizedEndDate } }] : []),
      ],
    },
  });

  if (outOfRangeCount > 0) {
    throw new ApiError(
      409,
      "CYCLE_RANGE_EXCLUDES_EXISTING_ENTRIES",
      "Cycle date range excludes existing observations. Adjust entries first.",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.cycle.update({
      where: { id: cycleId },
      data: {
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
        isActive: nextIsActive,
      },
    });

    const days = await tx.dailyObservation.findMany({
      where: { cycleId },
      select: { id: true, date: true },
    });

    for (const day of days) {
      const cycleDay = Math.max(1, daysBetween(normalizedStartDate, day.date) + 1);
      await tx.dailyObservation.update({
        where: { id: day.id },
        data: { cycleDay },
      });
    }
  });

  const refreshed = await prisma.cycle.findUnique({
    where: { id: cycleId },
    include: {
      days: true,
      interpretations: true,
      overrides: true,
    },
  });

  if (!refreshed) {
    throw new ApiError(404, "CYCLE_NOT_FOUND", "Cycle not found");
  }

  return mapCycle(refreshed);
}

export async function upsertDailyObservation(params: {
  userId: string;
  cycleId: string;
  date: Date;
  bbtValue?: number | null;
  bbtUnit: BbtUnit;
  mucusStretch: MucusStretch;
  mucusTransparency: MucusTransparency;
  mucusSlipperiness: MucusSlipperiness;
  mostFertileFrequency: MostFertileFrequency;
  cervixPosition: CervixPosition;
  bleedingLevel: number;
  intercourse: boolean;
  notes: string;
}) {
  const cycle = await prisma.cycle.findFirst({
    where: { id: params.cycleId, userId: params.userId },
  });

  if (!cycle) {
    throw new ApiError(404, "CYCLE_NOT_FOUND", "Cycle not found");
  }

  const date = startOfDayUtc(params.date);
  if (date < startOfDayUtc(cycle.startDate)) {
    throw new ApiError(400, "DATE_BEFORE_CYCLE_START", "Observation date is before cycle start date");
  }
  if (cycle.endDate && date > startOfDayUtc(cycle.endDate)) {
    throw new ApiError(400, "DATE_AFTER_CYCLE_END", "Observation date is after cycle end date");
  }

  const conflictingObservation = await prisma.dailyObservation.findFirst({
    where: {
      date,
      cycleId: { not: params.cycleId },
      cycle: {
        userId: params.userId,
      },
    },
    select: {
      id: true,
    },
  });

  if (conflictingObservation) {
    throw new ApiError(
      409,
      "DATE_ALREADY_USED_IN_ANOTHER_CYCLE",
      "This date already has an observation in another cycle.",
    );
  }

  const cycleDay = Math.max(1, daysBetween(cycle.startDate, date) + 1);
  const bbtCelsius =
    params.bbtValue === undefined || params.bbtValue === null
      ? null
      : normalizeBbtToCelsius(params.bbtValue, params.bbtUnit);

  const normalizedForStretch: {
    mucusStretch: MucusStretch;
    mucusTransparency: MucusTransparency;
    mucusSlipperiness: MucusSlipperiness;
    mostFertileFrequency: MostFertileFrequency;
  } = {
    mucusStretch: params.mucusStretch,
    // Transparency is not used for damp (2) observations.
    mucusTransparency: params.mucusStretch === 2 ? "X" : params.mucusTransparency,
    mucusSlipperiness: params.mucusSlipperiness,
    mostFertileFrequency: params.mostFertileFrequency,
  };

  const normalizedObservation =
    params.bleedingLevel >= 3
      ? {
          mucusStretch: 0 as MucusStretch,
          mucusTransparency: "X" as MucusTransparency,
          mucusSlipperiness: "X" as MucusSlipperiness,
          mostFertileFrequency: "NONE" as MostFertileFrequency,
        }
      : normalizedForStretch;

  const day = await prisma.dailyObservation.upsert({
    where: {
      cycleId_date: {
        cycleId: params.cycleId,
        date,
      },
    },
    create: {
      cycleId: params.cycleId,
      date,
      cycleDay,
      bbtCelsius,
      mucusStretch: normalizedObservation.mucusStretch,
      mucusTransparency: normalizedObservation.mucusTransparency,
      mucusSlipperiness: normalizedObservation.mucusSlipperiness,
      mostFertileFrequency: normalizedObservation.mostFertileFrequency,
      cervixPosition: params.cervixPosition,
      bleedingLevel: params.bleedingLevel,
      intercourse: params.intercourse,
      notes: params.notes,
    },
    update: {
      cycleDay,
      bbtCelsius,
      mucusStretch: normalizedObservation.mucusStretch,
      mucusTransparency: normalizedObservation.mucusTransparency,
      mucusSlipperiness: normalizedObservation.mucusSlipperiness,
      mostFertileFrequency: normalizedObservation.mostFertileFrequency,
      cervixPosition: params.cervixPosition,
      bleedingLevel: params.bleedingLevel,
      intercourse: params.intercourse,
      notes: params.notes,
    },
  });

  return day;
}

export async function clearDailyObservation(params: {
  userId: string;
  cycleId: string;
  date: Date;
}) {
  const cycle = await prisma.cycle.findFirst({
    where: { id: params.cycleId, userId: params.userId },
    select: { id: true },
  });

  if (!cycle) {
    throw new ApiError(404, "CYCLE_NOT_FOUND", "Cycle not found");
  }

  const date = startOfDayUtc(params.date);
  const deleted = await prisma.dailyObservation.deleteMany({
    where: {
      cycleId: params.cycleId,
      date,
    },
  });

  return {
    cleared: deleted.count > 0,
  };
}

export async function upsertOverride(params: {
  userId: string;
  cycleId: string;
  date: Date;
  status: FertilityStatus;
  reason: string;
}) {
  const cycle = await prisma.cycle.findFirst({
    where: {
      id: params.cycleId,
      userId: params.userId,
    },
  });

  if (!cycle) {
    throw new ApiError(404, "CYCLE_NOT_FOUND", "Cycle not found");
  }

  const date = startOfDayUtc(params.date);

  return prisma.overrideDay.upsert({
    where: {
      cycleId_date: {
        cycleId: params.cycleId,
        date,
      },
    },
    create: {
      cycleId: params.cycleId,
      date,
      overriddenStatus: params.status,
      reason: params.reason,
    },
    update: {
      overriddenStatus: params.status,
      reason: params.reason,
      overriddenAt: new Date(),
    },
  });
}

export async function recomputeCycle(cycleId: string, userId: string) {
  const [cycle, settings] = await Promise.all([
    prisma.cycle.findFirst({
      where: { id: cycleId, userId },
      include: {
        days: {
          orderBy: { date: "asc" },
        },
      },
    }),
    ensureUserSettings(userId),
  ]);

  if (!cycle) {
    throw new ApiError(404, "CYCLE_NOT_FOUND", "Cycle not found");
  }

  const computed = computeInterpretation({
    days: cycle.days.map((day) => ({
      date: day.date,
      cycleDay: day.cycleDay ?? Math.max(1, daysBetween(cycle.startDate, day.date) + 1),
      bbtCelsius: day.bbtCelsius,
      mucusStretch: day.mucusStretch as MucusStretch,
      mucusTransparency: day.mucusTransparency as MucusTransparency,
      mucusSlipperiness: day.mucusSlipperiness as MucusSlipperiness,
    })),
    tempRiseThresholdC: settings.tempRiseThresholdC,
    disclaimerAccepted: Boolean(settings.disclaimerAcceptedAt),
  });

  await prisma.$transaction(async (tx) => {
    await tx.interpretationDay.deleteMany({ where: { cycleId } });

    if (computed.length > 0) {
      await tx.interpretationDay.createMany({
        data: computed.map((day) => ({
          cycleId,
          date: day.date,
          status: day.status,
          ruleTrace: day.triggeredRules as unknown as Prisma.InputJsonValue,
          reasonCodes: day.reasonCodes as unknown as Prisma.InputJsonValue,
        })),
      });
    }

    await tx.cycle.update({
      where: { id: cycleId },
      data: {
        interpretationStale: false,
        interpretationStaleReason: null,
      },
    });
  });

  logEvent("info", "cycle.recompute.success", { cycleId, computedDays: computed.length });

  return {
    computedDays: computed.length,
    postOvulatoryInferredFrom: computed.find((d) => d.triggeredRules.includes("post_ovulatory_infertile_start"))
      ?.date,
  };
}

export async function markCycleStale(cycleId: string, reason: string) {
  await prisma.cycle.update({
    where: { id: cycleId },
    data: {
      interpretationStale: true,
      interpretationStaleReason: reason.slice(0, 500),
    },
  });

  logEvent("warn", "cycle.recompute.stale", { cycleId, reason });
}

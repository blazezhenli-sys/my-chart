import { z } from "zod";

import {
  BBT_UNITS,
  CERVIX_POSITIONS,
  FERTILITY_STATUSES,
  MOST_FERTILE_FREQUENCY_VALUES,
  MUCUS_SLIPPERINESS_VALUES,
  MUCUS_STRETCH_VALUES,
  MUCUS_TRANSPARENCY_VALUES,
} from "@/types/contracts";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const registerSchema = z.object({
  email: z.string().email().max(256),
  password: z.string().min(10).max(128),
});

export const loginSchema = registerSchema;

export const createCycleSchema = z.object({
  startDate: z.string().regex(datePattern),
});

export const updateCycleSchema = z.object({
  startDate: z.string().regex(datePattern).optional(),
  endDate: z.string().regex(datePattern).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const dailyObservationSchema = z.object({
  bbtValue: z.number().min(20).max(120).optional().nullable(),
  bbtUnit: z.enum(BBT_UNITS).optional().default("C"),
  mucusStretch: z
    .number()
    .int()
    .refine((value) => MUCUS_STRETCH_VALUES.includes(value as (typeof MUCUS_STRETCH_VALUES)[number]), {
      message: "mucusStretch must be one of: 0, 2, 6, 8, 10",
    })
    .optional()
    .default(0),
  mucusTransparency: z.enum(MUCUS_TRANSPARENCY_VALUES).optional().default("X"),
  mucusSlipperiness: z.enum(MUCUS_SLIPPERINESS_VALUES).optional().default("X"),
  mostFertileFrequency: z.enum(MOST_FERTILE_FREQUENCY_VALUES).optional().default("NONE"),
  cervixPosition: z.enum(CERVIX_POSITIONS).optional().default("unknown"),
  bleedingLevel: z.number().int().min(0).max(4).optional().default(0),
  intercourse: z.boolean().optional().default(false),
  notes: z.string().max(1000).optional().default(""),
});

export const overrideSchema = z.object({
  status: z.enum(FERTILITY_STATUSES),
  reason: z.string().trim().min(5).max(500),
});

export const settingsSchema = z.object({
  preferredUnit: z.enum(BBT_UNITS).optional(),
  cycleLengthHint: z.number().int().min(15).max(60).nullable().optional(),
  lutealLengthHint: z.number().int().min(7).max(20).nullable().optional(),
  tempRiseThresholdC: z.number().min(0.05).max(0.5).optional(),
  acceptDisclaimer: z.boolean().optional(),
});

export function parseJsonBody<T>(schema: z.ZodType<T>, payload: unknown) {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false as const, issues: parsed.error.flatten() };
  }

  return { ok: true as const, value: parsed.data };
}

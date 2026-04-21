import type {
  BbtUnit,
  CervixPosition,
  FertilityStatus,
  MostFertileFrequency,
  MucusSlipperiness,
  MucusStretch,
  MucusTransparency,
} from "@/types/contracts";

export type CycleDayView = {
  date: string;
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
  autoStatus: FertilityStatus;
  status: FertilityStatus;
  triggeredRules: string[];
  reasonCodes: string[];
  override: {
    status: FertilityStatus;
    reason: string;
    overriddenAt: string;
  } | null;
};

export type CycleView = {
  id: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  interpretationStale: boolean;
  interpretationStaleReason: string | null;
  days: CycleDayView[];
};

export type SettingsView = {
  id: string;
  userId: string;
  preferredUnit: BbtUnit;
  cycleLengthHint: number | null;
  lutealLengthHint: number | null;
  tempRiseThresholdC: number;
  disclaimerAcceptedAt: string | null;
};

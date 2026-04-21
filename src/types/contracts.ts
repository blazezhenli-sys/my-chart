export const BBT_UNITS = ["C", "F"] as const;
export type BbtUnit = (typeof BBT_UNITS)[number];

export const MUCUS_STRETCH_VALUES = [0, 2, 6, 8, 10] as const;
export type MucusStretch = number;

export const MUCUS_TRANSPARENCY_VALUES = ["X", "C", "K"] as const;
export type MucusTransparency = (typeof MUCUS_TRANSPARENCY_VALUES)[number];

export const MUCUS_SLIPPERINESS_VALUES = ["X", "N", "L"] as const;
export type MucusSlipperiness = (typeof MUCUS_SLIPPERINESS_VALUES)[number];

export const MOST_FERTILE_FREQUENCY_VALUES = ["NONE", "ONE", "TWO", "THREE", "AD"] as const;
export type MostFertileFrequency = (typeof MOST_FERTILE_FREQUENCY_VALUES)[number];

export const CERVIX_POSITIONS = ["low", "medium", "high", "unknown"] as const;
export type CervixPosition = (typeof CERVIX_POSITIONS)[number];

export const FERTILITY_STATUSES = ["fertile", "non_fertile", "uncertain"] as const;
export type FertilityStatus = (typeof FERTILITY_STATUSES)[number];

export type DailyObservationInput = {
  date: string;
  bbtValue?: number | null;
  bbtUnit?: BbtUnit;
  mucusStretch?: MucusStretch;
  mucusTransparency?: MucusTransparency;
  mucusSlipperiness?: MucusSlipperiness;
  mostFertileFrequency?: MostFertileFrequency;
  cervixPosition?: CervixPosition;
  bleedingLevel?: number;
  intercourse?: boolean;
  notes?: string;
};

export type InterpretationResult = {
  date: string;
  status: FertilityStatus;
  triggeredRules: string[];
  reasonCodes: string[];
  overridden: boolean;
  overrideReason?: string;
};

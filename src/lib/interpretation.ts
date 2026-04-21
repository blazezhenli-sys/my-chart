import type { FertilityStatus, MucusSlipperiness, MucusStretch, MucusTransparency } from "@/types/contracts";
import { addDays, startOfDayUtc } from "@/lib/dates";

type ObservationDay = {
  date: Date;
  cycleDay: number;
  bbtCelsius: number | null;
  mucusStretch: MucusStretch;
  mucusTransparency: MucusTransparency;
  mucusSlipperiness: MucusSlipperiness;
};

type ComputeParams = {
  days: ObservationDay[];
  tempRiseThresholdC: number;
  disclaimerAccepted: boolean;
};

export type ComputedDay = {
  date: Date;
  status: FertilityStatus;
  triggeredRules: string[];
  reasonCodes: string[];
};

function isPeakTypeMucus(day: ObservationDay) {
  const transparencyIsPeak = day.mucusStretch >= 6 && day.mucusTransparency === "K";
  return day.mucusStretch === 10 || transparencyIsPeak || day.mucusSlipperiness === "L";
}

function hasMucus(day: ObservationDay) {
  const transparencyIndicatesMucus = day.mucusStretch >= 6 && day.mucusTransparency === "K";
  return day.mucusStretch > 0 || transparencyIndicatesMucus || day.mucusSlipperiness === "L";
}

function findFertileStartPeakIndex(days: ObservationDay[]) {
  for (let i = 0; i < days.length; i += 1) {
    if (!isPeakTypeMucus(days[i])) {
      continue;
    }

    const following = days.slice(i + 1, i + 4);
    if (following.length < 3) {
      return i;
    }

    if (following.some((day) => isPeakTypeMucus(day))) {
      return i;
    }
  }

  return null;
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

export function computeInterpretation({ days, tempRiseThresholdC, disclaimerAccepted }: ComputeParams): ComputedDay[] {
  void tempRiseThresholdC;

  if (days.length === 0) {
    return [];
  }

  const sorted = [...days].sort((a, b) => startOfDayUtc(a.date).getTime() - startOfDayUtc(b.date).getTime());

  const fertileStartIndex = findFertileStartPeakIndex(sorted);

  const peakMucusIndex = (() => {
    for (let i = sorted.length - 1; i >= 0; i -= 1) {
      if (isPeakTypeMucus(sorted[i])) {
        return i;
      }
    }

    return null;
  })();
  const postOvulationStartDate = peakMucusIndex === null ? null : addDays(sorted[peakMucusIndex].date, 3);

  return sorted.map((day, index) => {
    const reasonCodes: string[] = [];
    const triggeredRules: string[] = [];

    if (index === fertileStartIndex) {
      triggeredRules.push("fertile_start_peak_type_mucus");
    }

    if (peakMucusIndex !== null && index === peakMucusIndex) {
      triggeredRules.push("peak_mucus_identified");
    }

    let status: FertilityStatus = "uncertain";

    if (!disclaimerAccepted) {
      status = "uncertain";
      reasonCodes.push("disclaimer_not_accepted");
    } else if (fertileStartIndex === null || index < fertileStartIndex) {
      status = "non_fertile";
      triggeredRules.push("pre_fertile_phase");
    } else if (postOvulationStartDate && startOfDayUtc(day.date) >= startOfDayUtc(postOvulationStartDate)) {
      status = "non_fertile";
      triggeredRules.push("post_ovulatory_infertile_start");
    } else {
      status = "fertile";
      triggeredRules.push("active_fertile_window");
    }

    if (fertileStartIndex === null && peakMucusIndex !== null && hasMucus(day)) {
      reasonCodes.push("peak_reset_no_followup_within_3_days");
    }

    return {
      date: day.date,
      status,
      triggeredRules: unique(triggeredRules),
      reasonCodes: unique(reasonCodes),
    };
  });
}

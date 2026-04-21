import { describe, expect, it } from "vitest";

import { computeInterpretation } from "@/lib/interpretation";

function d(value: string) {
  return new Date(value);
}

describe("symptothermal interpretation", () => {
  it("marks post-ovulatory non-fertile from peak+3 using mucus-only interpretation", () => {
    const days = [
      { date: d("2026-01-01"), cycleDay: 1, bbtCelsius: 36.4, mucusStretch: 0 as const, mucusTransparency: "C" as const, mucusSlipperiness: "N" as const },
      { date: d("2026-01-02"), cycleDay: 2, bbtCelsius: 36.42, mucusStretch: 0 as const, mucusTransparency: "C" as const, mucusSlipperiness: "N" as const },
      { date: d("2026-01-03"), cycleDay: 3, bbtCelsius: 36.39, mucusStretch: 0 as const, mucusTransparency: "C" as const, mucusSlipperiness: "N" as const },
      { date: d("2026-01-04"), cycleDay: 4, bbtCelsius: 36.41, mucusStretch: 2 as const, mucusTransparency: "C" as const, mucusSlipperiness: "N" as const },
      { date: d("2026-01-05"), cycleDay: 5, bbtCelsius: 36.4, mucusStretch: 6 as const, mucusTransparency: "C" as const, mucusSlipperiness: "N" as const },
      { date: d("2026-01-06"), cycleDay: 6, bbtCelsius: 36.41, mucusStretch: 10 as const, mucusTransparency: "K" as const, mucusSlipperiness: "L" as const },
      { date: d("2026-01-07"), cycleDay: 7, bbtCelsius: 36.8, mucusStretch: 10 as const, mucusTransparency: "K" as const, mucusSlipperiness: "L" as const },
      { date: d("2026-01-08"), cycleDay: 8, bbtCelsius: 36.83, mucusStretch: 0 as const, mucusTransparency: "C" as const, mucusSlipperiness: "N" as const },
      { date: d("2026-01-09"), cycleDay: 9, bbtCelsius: 36.85, mucusStretch: 0 as const, mucusTransparency: "C" as const, mucusSlipperiness: "N" as const },
      { date: d("2026-01-10"), cycleDay: 10, bbtCelsius: 36.86, mucusStretch: 0 as const, mucusTransparency: "C" as const, mucusSlipperiness: "N" as const },
      { date: d("2026-01-11"), cycleDay: 11, bbtCelsius: 36.9, mucusStretch: 0 as const, mucusTransparency: "C" as const, mucusSlipperiness: "N" as const },
      { date: d("2026-01-12"), cycleDay: 12, bbtCelsius: 36.92, mucusStretch: 0 as const, mucusTransparency: "C" as const, mucusSlipperiness: "N" as const },
    ];

    const result = computeInterpretation({
      days,
      tempRiseThresholdC: 0.2,
      disclaimerAccepted: true,
    });

    expect(result[0].status).toBe("non_fertile");
    expect(result[5].status).toBe("fertile");
    expect(result[9].status).toBe("non_fertile");
    expect(result.some((day) => day.triggeredRules.includes("fertile_start_peak_type_mucus"))).toBe(true);
    expect(result.some((day) => day.triggeredRules.includes("post_ovulatory_infertile_start"))).toBe(true);
  });

  it("keeps days non-fertile before any peak-type mucus appears", () => {
    const days = [
      { date: d("2026-02-01"), cycleDay: 1, bbtCelsius: 36.4, mucusStretch: 0 as const, mucusTransparency: "C" as const, mucusSlipperiness: "N" as const },
      { date: d("2026-02-02"), cycleDay: 2, bbtCelsius: null, mucusStretch: 0 as const, mucusTransparency: "C" as const, mucusSlipperiness: "N" as const },
      { date: d("2026-02-03"), cycleDay: 3, bbtCelsius: null, mucusStretch: 0 as const, mucusTransparency: "C" as const, mucusSlipperiness: "N" as const },
      { date: d("2026-02-04"), cycleDay: 4, bbtCelsius: null, mucusStretch: 0 as const, mucusTransparency: "C" as const, mucusSlipperiness: "N" as const },
      { date: d("2026-02-05"), cycleDay: 5, bbtCelsius: null, mucusStretch: 0 as const, mucusTransparency: "C" as const, mucusSlipperiness: "N" as const },
      { date: d("2026-02-06"), cycleDay: 6, bbtCelsius: null, mucusStretch: 0 as const, mucusTransparency: "C" as const, mucusSlipperiness: "N" as const },
    ];

    const result = computeInterpretation({
      days,
      tempRiseThresholdC: 0.2,
      disclaimerAccepted: true,
    });

    expect(result.every((day) => day.status === "non_fertile")).toBe(true);
  });

  it("resets an isolated early peak if the next 3 days are not peak type", () => {
    const days = [
      { date: d("2026-03-01"), cycleDay: 1, bbtCelsius: null, mucusStretch: 0 as const, mucusTransparency: "C" as const, mucusSlipperiness: "N" as const },
      { date: d("2026-03-02"), cycleDay: 2, bbtCelsius: null, mucusStretch: 10 as const, mucusTransparency: "K" as const, mucusSlipperiness: "L" as const },
      { date: d("2026-03-03"), cycleDay: 3, bbtCelsius: null, mucusStretch: 0 as const, mucusTransparency: "C" as const, mucusSlipperiness: "N" as const },
      { date: d("2026-03-04"), cycleDay: 4, bbtCelsius: null, mucusStretch: 0 as const, mucusTransparency: "C" as const, mucusSlipperiness: "N" as const },
      { date: d("2026-03-05"), cycleDay: 5, bbtCelsius: null, mucusStretch: 0 as const, mucusTransparency: "C" as const, mucusSlipperiness: "N" as const },
      { date: d("2026-03-06"), cycleDay: 6, bbtCelsius: null, mucusStretch: 10 as const, mucusTransparency: "K" as const, mucusSlipperiness: "L" as const },
      { date: d("2026-03-07"), cycleDay: 7, bbtCelsius: null, mucusStretch: 10 as const, mucusTransparency: "K" as const, mucusSlipperiness: "L" as const },
    ];

    const result = computeInterpretation({
      days,
      tempRiseThresholdC: 0.2,
      disclaimerAccepted: true,
    });

    expect(result[1].status).toBe("non_fertile");
    expect(result[5].status).toBe("fertile");
  });
});

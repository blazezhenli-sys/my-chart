import { describe, expect, it } from "vitest";

import { celsiusToFahrenheit, fahrenheitToCelsius, normalizeBbtToCelsius } from "@/lib/temperature";

describe("temperature conversion", () => {
  it("converts celsius to fahrenheit", () => {
    expect(celsiusToFahrenheit(36.5)).toBeCloseTo(97.7, 2);
  });

  it("converts fahrenheit to celsius", () => {
    expect(fahrenheitToCelsius(98.6)).toBeCloseTo(37, 2);
  });

  it("normalizes valid temperature to celsius", () => {
    expect(normalizeBbtToCelsius(97.88, "F")).toBeCloseTo(36.6, 2);
    expect(normalizeBbtToCelsius(36.5, "C")).toBe(36.5);
  });

  it("rejects out-of-range temperatures", () => {
    expect(() => normalizeBbtToCelsius(30, "C")).toThrow("outside supported human basal range");
    expect(() => normalizeBbtToCelsius(110, "F")).toThrow("outside supported human basal range");
  });
});

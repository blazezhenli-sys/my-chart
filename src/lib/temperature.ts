import { ApiError } from "@/lib/errors";
import type { BbtUnit } from "@/types/contracts";

const MIN_C = 34;
const MAX_C = 40.5;

export function fahrenheitToCelsius(valueF: number) {
  return ((valueF - 32) * 5) / 9;
}

export function celsiusToFahrenheit(valueC: number) {
  return (valueC * 9) / 5 + 32;
}

export function normalizeBbtToCelsius(value: number, unit: BbtUnit) {
  const celsius = unit === "F" ? fahrenheitToCelsius(value) : value;
  const rounded = Math.round(celsius * 100) / 100;

  if (rounded < MIN_C || rounded > MAX_C) {
    throw new ApiError(400, "BBT_OUT_OF_RANGE", "Temperature is outside supported human basal range", {
      minCelsius: MIN_C,
      maxCelsius: MAX_C,
    });
  }

  return rounded;
}

export function formatBbt(celsius: number | null, unit: BbtUnit) {
  if (celsius === null) {
    return null;
  }

  const value = unit === "F" ? celsiusToFahrenheit(celsius) : celsius;
  return Math.round(value * 100) / 100;
}

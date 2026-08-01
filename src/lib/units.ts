import type { Unit } from "./types";

export const KG_PER_LB = 0.45359237;

export function toKg(value: number, unit: Unit): number {
  return unit === "kg" ? value : value * KG_PER_LB;
}

export function fromKg(kg: number, unit: Unit): number {
  return unit === "kg" ? kg : kg / KG_PER_LB;
}

export const CM_PER_INCH = 2.54;

export function inchesToCm(inches: number): number {
  return inches * CM_PER_INCH;
}

export function cmToInches(cm: number): number {
  return cm / CM_PER_INCH;
}

/** Split centimetres into whole feet + remaining inches (rounded to 1 dp). */
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalIn = cmToInches(cm);
  const feet = Math.floor(totalIn / 12);
  return { feet, inches: Math.round((totalIn - feet * 12) * 10) / 10 };
}

export function feetInchesToCm(feet: number, inches: number): number {
  return inchesToCm(feet * 12 + inches);
}

/** Human-readable height in the athlete's preferred unit system. */
export function formatHeight(cm: number | undefined, unit: Unit): string {
  if (cm === undefined || !(cm > 0)) return "—";
  if (unit === "kg") return `${Math.round(cm)} cm`;
  const { feet, inches } = cmToFeetInches(cm);
  return `${feet}' ${Math.round(inches)}"`;
}

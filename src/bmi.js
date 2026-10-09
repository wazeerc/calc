import { parseInput } from './converter.js'

export const AGE_MIN = 1
export const AGE_MAX = 130
export const HEIGHT_MIN_CM = 50
export const HEIGHT_MAX_CM = 300
export const WEIGHT_MIN_KG = 20
export const WEIGHT_MAX_KG = 500

// Bands ordered ascending; each band covers [min, max). The top band is
// open-ended. Classification runs on the 1-decimal rounded BMI so the band
// always agrees with the displayed number.
export const BANDS = [
  { id: 'severe-thinness', label: 'Severe Thinness', short: '< 16', min: 0, max: 16 },
  { id: 'moderate-thinness', label: 'Moderate Thinness', short: '16–17', min: 16, max: 17 },
  { id: 'mild-thinness', label: 'Mild Thinness', short: '17–18.5', min: 17, max: 18.5 },
  { id: 'normal', label: 'Normal', short: '18.5–25', min: 18.5, max: 25 },
  { id: 'overweight', label: 'Overweight', short: '25–30', min: 25, max: 30 },
  { id: 'obese-1', label: 'Obese Class I', short: '30–35', min: 30, max: 35 },
  { id: 'obese-2', label: 'Obese Class II', short: '35–40', min: 35, max: 40 },
  { id: 'obese-3', label: 'Obese Class III', short: '> 40', min: 40, max: Infinity },
]

function inRange(value, min, max) {
  return Number.isFinite(value) && value >= min && value <= max
}

function hasMinus(raw) {
  return /-/.test(String(raw))
}

export function parseAge(raw) {
  if (hasMinus(raw)) return { empty: true, value: null }
  const parsed = parseInput(raw)
  if (parsed.empty) return { empty: true, value: null }
  if (!inRange(parsed.value, AGE_MIN, AGE_MAX)) return { empty: true, value: null }
  return { empty: false, value: Math.floor(parsed.value) }
}

export function parseWeightKg(raw) {
  if (hasMinus(raw)) return { empty: true, value: null }
  const parsed = parseInput(raw)
  if (parsed.empty) return { empty: true, value: null }
  if (!inRange(parsed.value, WEIGHT_MIN_KG, WEIGHT_MAX_KG)) return { empty: true, value: null }
  return { empty: false, value: parsed.value }
}

export function parseHeightCm(raw) {
  if (hasMinus(raw)) return { empty: true, value: null }
  const parsed = parseInput(raw)
  if (parsed.empty) return { empty: true, value: null }
  if (!inRange(parsed.value, HEIGHT_MIN_CM, HEIGHT_MAX_CM)) return { empty: true, value: null }
  return { empty: false, value: parsed.value }
}

export function computeBmi(weightKg, heightCm) {
  const m = heightCm / 100
  return weightKg / (m * m)
}

export function formatBmi(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return ''
  return value.toFixed(1)
}

export function classifyBmi(bmi) {
  if (bmi === null || bmi === undefined || !Number.isFinite(bmi)) return null
  const rounded = Math.round(bmi * 10) / 10
  return BANDS.find((b) => rounded >= b.min && rounded < b.max) || null
}

// 'full' (20+), 'qualified' (18-19, adult scale is approximate),
// 'refused' (under 18, adult-only message, no number).
export function resolveAgeGate(age) {
  if (age === null || age === undefined || !Number.isFinite(age)) return null
  if (age < 18) return 'refused'
  if (age < 20) return 'qualified'
  return 'full'
}

export function calculate(rawAge, rawWeightKg, rawHeightCm) {
  const age = parseAge(rawAge)
  const weight = parseWeightKg(rawWeightKg)
  const height = parseHeightCm(rawHeightCm)
  if (age.empty || weight.empty || height.empty) {
    return { empty: true, age: null, bmi: null, band: null, gate: null }
  }
  const bmi = computeBmi(weight.value, height.value)
  const band = classifyBmi(bmi)
  const gate = resolveAgeGate(age.value)
  return { empty: false, age: age.value, bmi, band, gate }
}

export const UNITS = [
  { id: 'perche', label: 'Perche', symbol: '', m2: 42.2087 },
  { id: 'toise', label: 'Toise', symbol: '', m2: 3.7986 },
  { id: 'm2', label: 'Square Meters (m²)', symbol: 'm²', m2: 1 },
  { id: 'ft2', label: 'Square Feet (ft²)', symbol: 'ft²', m2: 0.09290304 },
  { id: 'arpent', label: 'Arpent', symbol: '', m2: 4220.87 },
  { id: 'hectare', label: 'Hectare', symbol: 'ha', m2: 10000 },
]

export function unitById(id) {
  return UNITS.find((u) => u.id === id)
}

export function parseInput(raw) {
  if (raw === null || raw === undefined) return { empty: true, value: null }
  const text = String(raw).trim()
  if (text === '') return { empty: true, value: null }
  const dotted = text.replace(/,/g, '.')
  const cleaned = dotted.replace(/[^0-9.]/g, '')
  if (cleaned === '') return { empty: true, value: null }
  const parts = cleaned.split('.')
  const normalized = parts.length <= 1 ? parts[0] : parts[0] + '.' + parts.slice(1).join('')
  if (normalized === '' || normalized === '.') return { empty: true, value: null }
  const value = Number(normalized)
  if (Number.isNaN(value)) return { empty: true, value: null }
  return { empty: false, value }
}

export function convert(sourceId, raw) {
  const source = unitById(sourceId)
  if (!source) throw new Error('Unknown unit: ' + sourceId)
  const parsed = parseInput(raw)
  if (parsed.empty) {
    const values = {}
    for (const u of UNITS) values[u.id] = null
    return { m2: null, values }
  }
  const m2 = parsed.value * source.m2
  const values = {}
  for (const u of UNITS) values[u.id] = m2 / u.m2
  return { m2, values }
}

export function formatPlain(value) {
  if (value === null || value === undefined) return ''
  return value.toFixed(2)
}

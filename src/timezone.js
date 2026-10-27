// Curated IANA zones for the two-zone converter. This module is DOM-free so
// Node tests exercise the same timezone arithmetic the browser uses.

export const ABBREVIATIONS = {
  ET: 'America/New_York',
  CT: 'America/Chicago',
  MT: 'America/Denver',
  PT: 'America/Los_Angeles',
  CET: 'Europe/Paris',
  IST: 'Asia/Kolkata',
  JST: 'Asia/Tokyo',
  AEST: 'Australia/Sydney',
}

const ABBR_BY_ZONE = {}
for (const [abbr, zone] of Object.entries(ABBREVIATIONS)) ABBR_BY_ZONE[zone] = abbr

// [IANA zone, city label(s), optional primary city]. One row per zone. The
// primary city is the first label unless the row supplies one explicitly (UTC).
const ZONES = [
  ['Pacific/Honolulu', 'Honolulu'],
  ['America/Anchorage', 'Anchorage'],
  ['America/Los_Angeles', 'Los Angeles, San Francisco, Seattle'],
  ['America/Denver', 'Denver, Salt Lake City, Albuquerque'],
  ['America/Phoenix', 'Phoenix, Tucson'],
  ['America/Chicago', 'Chicago, Dallas, Houston'],
  ['America/Mexico_City', 'Mexico City, Guadalajara, Monterrey'],
  ['America/New_York', 'New York, Washington, Boston'],
  ['America/Bogota', 'Bogotá, Medellín, Cali'],
  ['America/Santiago', 'Santiago, Valparaíso, Concepción'],
  ['America/Sao_Paulo', 'São Paulo, Rio de Janeiro, Brasília'],
  ['America/Argentina/Buenos_Aires', 'Buenos Aires, Córdoba, Rosario'],
  ['UTC', 'Accra, Reykjavík', 'UTC'],
  ['Europe/London', 'London, Dublin, Lisbon'],
  ['Europe/Paris', 'Paris, Amsterdam, Brussels'],
  ['Europe/Berlin', 'Berlin, Munich, Hamburg'],
  ['Europe/Athens', 'Athens, Sofia, Bucharest'],
  ['Europe/Moscow', 'Moscow, St Petersburg, Minsk'],
  ['Europe/Istanbul', 'Istanbul, Ankara, Izmir'],
  ['Africa/Lagos', 'Lagos, Abuja, Port Harcourt'],
  ['Africa/Johannesburg', 'Johannesburg, Cape Town, Pretoria'],
  ['Africa/Nairobi', 'Nairobi, Mombasa, Addis Ababa'],
  ['Indian/Mauritius', 'Port Louis, Curepipe, Quatre Bornes'],
  ['Asia/Tehran', 'Tehran, Mashhad, Isfahan'],
  ['Asia/Dubai', 'Dubai, Abu Dhabi, Muscat'],
  ['Asia/Kabul', 'Kabul, Kandahar, Herat'],
  ['Asia/Karachi', 'Karachi, Lahore, Islamabad'],
  ['Asia/Kolkata', 'Kolkata, Mumbai, Delhi'],
  ['Asia/Kathmandu', 'Kathmandu, Pokhara, Lalitpur'],
  ['Asia/Dhaka', 'Dhaka, Chittagong, Khulna'],
  ['Asia/Bangkok', 'Bangkok, Hanoi, Ho Chi Minh'],
  ['Asia/Jakarta', 'Jakarta, Surabaya, Bandung'],
  ['Asia/Shanghai', 'Shanghai, Beijing, Guangzhou'],
  ['Asia/Singapore', 'Singapore, Kuala Lumpur, Manila'],
  ['Asia/Hong_Kong', 'Hong Kong, Macau, Taipei'],
  ['Asia/Tokyo', 'Tokyo, Osaka, Sapporo'],
  ['Asia/Seoul', 'Seoul, Busan, Incheon'],
  ['Australia/Darwin', 'Darwin, Alice Springs, Katherine'],
  ['Australia/Brisbane', 'Brisbane, Gold Coast, Cairns'],
  ['Australia/Sydney', 'Sydney, Melbourne, Canberra'],
  ['Australia/Adelaide', 'Adelaide, Port Augusta, Whyalla'],
  ['Pacific/Auckland', 'Auckland, Wellington, Christchurch'],
  ['Pacific/Kiritimati', 'Kiritimati'],
]

// Zones whose current and future UTC offset and DST rules are identical may
// share one picker option. The representative zone supplies the conversion
// rules; the city label is editorial and capped at three names.
const ZONE_GROUPS = [
  {
    zone: 'America/Sao_Paulo',
    zones: ['America/Sao_Paulo', 'America/Argentina/Buenos_Aires'],
    cities: 'São Paulo, Rio de Janeiro, Buenos Aires',
  },
  {
    zone: 'Europe/Paris',
    zones: ['Europe/Paris', 'Europe/Berlin'],
    cities: 'Paris, Berlin, Amsterdam',
  },
  {
    zone: 'Indian/Mauritius',
    zones: ['Indian/Mauritius', 'Asia/Dubai'],
    cities: 'Dubai, Port Louis',
  },
  {
    zone: 'Europe/Moscow',
    zones: ['Europe/Moscow', 'Europe/Istanbul', 'Africa/Nairobi'],
    cities: 'Moscow, Istanbul, Nairobi',
  },
  {
    zone: 'Asia/Bangkok',
    zones: ['Asia/Bangkok', 'Asia/Jakarta'],
    cities: 'Bangkok, Jakarta, Hanoi',
  },
  {
    zone: 'Asia/Shanghai',
    zones: ['Asia/Shanghai', 'Asia/Singapore', 'Asia/Hong_Kong'],
    cities: 'Shanghai, Singapore, Hong Kong',
  },
  {
    zone: 'Asia/Tokyo',
    zones: ['Asia/Tokyo', 'Asia/Seoul'],
    cities: 'Tokyo, Osaka, Seoul',
  },
]

const GROUP_BY_MEMBER = new Map()
for (const group of ZONE_GROUPS) {
  for (const zone of group.zones) GROUP_BY_MEMBER.set(zone, group)
}

const PICKER_GROUPS = []
for (const [zone, cities, primary] of ZONES) {
  const group = GROUP_BY_MEMBER.get(zone)
  if (group) {
    if (group.zone !== zone) continue
    const abbr = ABBR_BY_ZONE[zone]
    const entry = {
      zone,
      zones: group.zones,
      city: group.cities.split(', ')[0],
      cities: group.cities,
    }
    if (abbr) entry.abbr = abbr
    PICKER_GROUPS.push(entry)
    continue
  }
  const abbr = ABBR_BY_ZONE[zone]
  const entry = { zone, zones: [zone], city: primary || cities.split(', ')[0], cities }
  if (abbr) entry.abbr = abbr
  PICKER_GROUPS.push(entry)
}

const ZONE_CATALOG = ZONES.map(([zone, cities, primary]) => {
  const abbr = ABBR_BY_ZONE[zone]
  const entry = { zone, city: primary || cities.split(', ')[0], cities }
  if (abbr) entry.abbr = abbr
  return entry
})

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const formatters = new Map()
const canonicalCache = new Map()

function formatterFor(zone) {
  let formatter = formatters.get(zone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
      hourCycle: 'h23',
    })
    formatters.set(zone, formatter)
  }
  return formatter
}

export function getZonedParts(zone, instant) {
  const parts = formatterFor(zone).formatToParts(new Date(instant))
  const result = {}
  for (const part of parts) {
    if (part.type !== 'literal') result[part.type] = part.value
  }
  return {
    year: Number(result.year),
    month: Number(result.month),
    day: Number(result.day),
    hour: Number(result.hour),
    minute: Number(result.minute),
    second: Number(result.second),
    weekday: result.weekday,
  }
}

export function getOffsetMinutes(zone, instant) {
  const ms = Number(instant)
  const parts = getZonedParts(zone, ms)
  const wall = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  return Math.round((wall - ms) / 60000)
}

export function canonicalZone(zone) {
  if (!zone || typeof zone !== 'string') return null
  if (canonicalCache.has(zone)) return canonicalCache.get(zone)
  let canonical = null
  try {
    canonical = new Intl.DateTimeFormat('en-US', { timeZone: zone }).resolvedOptions().timeZone || null
  } catch {
    canonical = null
  }
  canonicalCache.set(zone, canonical)
  return canonical
}

function findCatalogEntry(zone) {
  const canonical = canonicalZone(zone)
  if (!canonical) return null
  return ZONE_CATALOG.find((entry) => canonicalZone(entry.zone) === canonical) || null
}

function displayZone(zone) {
  const entry = findCatalogEntry(zone)
  return entry ? entry.zone : canonicalZone(zone)
}

export function isUtcZone(zone) {
  const canonical = canonicalZone(zone)
  return canonical === 'UTC' || canonical === 'Etc/UTC' || canonical === 'Etc/GMT'
}

export function cityForZone(zone) {
  const entry = findCatalogEntry(zone)
  if (entry) return entry.city
  const name = String(zone || '').split('/').pop()
  return (name || String(zone || '')).replace(/_/g, ' ')
}

export function detectZone() {
  try {
    const zone = new Intl.DateTimeFormat().resolvedOptions().timeZone
    return canonicalZone(zone) ? zone : null
  } catch {
    return null
  }
}

export function defaultZones(detected = detectZone()) {
  const zoneA = displayZone(detected) || 'UTC'
  return { zoneA, zoneB: isUtcZone(zoneA) ? 'Europe/London' : 'UTC' }
}

// Grouped entries for the UI.
export function pickerGroups(detected = detectZone()) {
  const entries = PICKER_GROUPS.map((entry) => ({
    ...entry,
    zones: entry.zones.slice(),
  }))
  const zone = displayZone(detected)
  if (!zone) return entries
  const canonical = canonicalZone(zone)
  const existing = entries.find((entry) =>
    entry.zones.some((member) => canonicalZone(member) === canonical),
  )
  if (existing) {
    existing.detected = true
    return entries
  }
  const city = cityForZone(zone)
  entries.push({ zone, zones: [zone], city, cities: city, detected: true })
  return entries
}

// Map any IANA zone to the representative zone of its picker group.
export function groupZoneFor(zone) {
  const canonical = canonicalZone(zone)
  if (!canonical) return zone
  const group = PICKER_GROUPS.find((entry) =>
    entry.zones.some((member) => canonicalZone(member) === canonical),
  )
  return group ? group.zone : displayZone(zone) || zone
}

export function formatOffset(minutes) {
  const rounded = Math.round(Number(minutes))
  if (!Number.isFinite(rounded) || rounded === 0) return 'UTC'
  const sign = rounded < 0 ? '−' : '+'
  const absolute = Math.abs(rounded)
  const hours = Math.floor(absolute / 60)
  const rest = absolute % 60
  return 'UTC' + sign + hours + (rest ? ':' + String(rest).padStart(2, '0') : '')
}

export function formatTime(parts) {
  if (!parts) return '--:--'
  return String(parts.hour).padStart(2, '0') + ':' + String(parts.minute).padStart(2, '0')
}

export function formatInputDate(parts) {
  if (!parts) return ''
  return (
    String(parts.year).padStart(4, '0') +
    '-' +
    String(parts.month).padStart(2, '0') +
    '-' +
    String(parts.day).padStart(2, '0')
  )
}

export function formatInputTime(parts) {
  return parts ? formatTime(parts) : ''
}

export function formatDate(parts, withYear = false) {
  if (!parts) return ''
  return parts.weekday + ' ' + parts.day + ' ' + MONTHS[parts.month - 1] + (withYear ? ' ' + parts.year : '')
}

export function sortZoneEntries(entries, instant) {
  return entries
    .map((entry) => ({ ...entry, offset: getOffsetMinutes(entry.zone, instant) }))
    .sort(
      (a, b) =>
        a.offset - b.offset ||
        (a.cities || a.city).localeCompare(b.cities || b.city) ||
        a.zone.localeCompare(b.zone),
    )
}

export function offsetSignature(entries, instant) {
  return entries.map((entry) => entry.zone + ':' + getOffsetMinutes(entry.zone, instant)).join('|')
}

export function formatZoneOption(entry) {
  return (
    formatOffset(entry.offset) +
    ' · ' +
    (entry.cities || entry.city) +
    (entry.abbr ? ' (' + entry.abbr + ')' : '') +
    (entry.detected ? ' · Detected' : '')
  )
}

export function parseWallInput(date, time) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ''))
  const timeMatch = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(String(time || ''))
  if (!dateMatch || !timeMatch) return null
  const year = Number(dateMatch[1])
  const month = Number(dateMatch[2])
  const day = Number(dateMatch[3])
  const hour = Number(timeMatch[1])
  const minute = Number(timeMatch[2])
  if (year < 1 || month < 1 || month > 12 || hour > 23 || minute > 59) return null
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate()
  if (day < 1 || day > days) return null
  return { year, month, day, hour, minute }
}

export function resolveWallTime(zone, year, month, day, hour, minute) {
  const desired = Date.UTC(year, month - 1, day, hour, minute)
  const offsets = []
  for (const delta of [0, -86400000, 86400000, -172800000, 172800000]) {
    const offset = getOffsetMinutes(zone, desired + delta)
    if (!offsets.includes(offset)) offsets.push(offset)
  }
  const candidates = []
  const matches = []
  for (const offset of offsets) {
    const instant = desired - offset * 60000
    const parts = getZonedParts(zone, instant)
    const wall = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute)
    const candidate = { instant, parts, wall, offset }
    candidates.push(candidate)
    if (
      parts.year === year &&
      parts.month === month &&
      parts.day === day &&
      parts.hour === hour &&
      parts.minute === minute
    ) {
      matches.push(candidate)
    }
  }
  if (matches.length) {
    matches.sort((a, b) => a.instant - b.instant)
    const first = matches[0]
    return {
      instant: first.instant,
      parts: first.parts,
      offset: getOffsetMinutes(zone, first.instant),
      adjusted: false,
      ambiguous: matches.length > 1,
    }
  }
  const forward = candidates
    .filter((candidate) => candidate.wall > desired)
    .sort((a, b) => a.wall - b.wall || a.instant - b.instant)
  const chosen =
    forward[0] ||
    candidates.sort(
      (a, b) => Math.abs(a.wall - desired) - Math.abs(b.wall - desired) || a.instant - b.instant,
    )[0]
  return {
    instant: chosen.instant,
    parts: chosen.parts,
    offset: getOffsetMinutes(zone, chosen.instant),
    adjusted: true,
    ambiguous: false,
  }
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  const hourText = hours ? hours + ' hour' + (hours === 1 ? '' : 's') : ''
  const minuteText = rest ? rest + ' minute' + (rest === 1 ? '' : 's') : ''
  return [hourText, minuteText].filter(Boolean).join(' ')
}

export function offsetSummary(zoneA, zoneB, instant) {
  const aOffset = getOffsetMinutes(zoneA, instant)
  const bOffset = getOffsetMinutes(zoneB, instant)
  const cityA = cityForZone(zoneA)
  const cityB = cityForZone(zoneB)
  const diff = bOffset - aOffset
  if (canonicalZone(zoneA) === canonicalZone(zoneB)) {
    return { minutes: diff, text: 'Both zones are on the same time.' }
  }
  if (diff === 0) {
    return { minutes: 0, text: cityA + ' and ' + cityB + ' are on the same time.' }
  }
  return {
    minutes: diff,
    text:
      cityA +
      ' is ' +
      formatDuration(Math.abs(diff)) +
      (diff > 0 ? ' behind ' : ' ahead of ') +
      cityB +
      '.',
  }
}

function fixedSummary(zoneA, zoneB, aParts, bParts) {
  return (
    'When it is ' +
    formatTime(aParts) +
    ' in ' +
    cityForZone(zoneA) +
    ' on ' +
    formatDate(aParts, true) +
    ', it will be ' +
    formatTime(bParts) +
    ' in ' +
    cityForZone(zoneB) +
    ' on ' +
    formatDate(bParts, true) +
    '.'
  )
}

export function deriveBoard(state, now = Date.now()) {
  const instant = Number(now)
  const zoneA = state.zoneA
  const zoneB = state.zoneB
  if (state.mode !== 'fixed') {
    const aParts = getZonedParts(zoneA, instant)
    const bParts = getZonedParts(zoneB, instant)
    return {
      mode: 'live',
      valid: true,
      a: {
        zone: zoneA,
        instant,
        parts: aParts,
        offset: getOffsetMinutes(zoneA, instant),
        adjusted: false,
        ambiguous: false,
      },
      b: { zone: zoneB, instant, parts: bParts, offset: getOffsetMinutes(zoneB, instant) },
      summary: offsetSummary(zoneA, zoneB, instant),
    }
  }
  const wall = parseWallInput(state.sourceDate, state.sourceTime)
  if (!wall) {
    return {
      mode: 'fixed',
      valid: false,
      a: {
        zone: zoneA,
        instant: null,
        parts: null,
        offset: getOffsetMinutes(zoneA, instant),
        adjusted: false,
        ambiguous: false,
      },
      b: null,
      summary: null,
    }
  }
  const resolved = resolveWallTime(zoneA, wall.year, wall.month, wall.day, wall.hour, wall.minute)
  const bParts = getZonedParts(zoneB, resolved.instant)
  const bOffset = getOffsetMinutes(zoneB, resolved.instant)
  return {
    mode: 'fixed',
    valid: true,
    a: {
      zone: zoneA,
      instant: resolved.instant,
      parts: resolved.parts,
      offset: resolved.offset,
      adjusted: resolved.adjusted,
      ambiguous: resolved.ambiguous,
    },
    b: {
      zone: zoneB,
      instant: resolved.instant,
      parts: bParts,
      offset: bOffset,
    },
    summary: {
      minutes: bOffset - resolved.offset,
      text: fixedSummary(zoneA, zoneB, resolved.parts, bParts),
    },
  }
}

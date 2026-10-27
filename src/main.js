import './style.css'
import { UNITS, convert, parseInput, formatPlain } from './converter.js'
import { BANDS, calculate, formatBmi, parseAge, parseWeightKg, parseHeightCm } from './bmi.js'
import {
  canonicalZone,
  cityForZone,
  defaultZones,
  deriveBoard,
  detectZone,
  formatDate,
  formatInputDate,
  formatInputTime,
  formatOffset,
  formatTime,
  formatZoneOption,
  groupZoneFor,
  offsetSignature,
  pickerGroups,
  sortZoneEntries,
} from './timezone.js'

const DEBOUNCE_MS = 200
const GITHUB_URL = 'https://github.com/wazeerc'

const app = document.querySelector('#app')

app.innerHTML = `
<header class="app-header">
  <div class="header-row">
    <div class="brand"><h1>CALC</h1><span class="tagline"><span aria-hidden="true">— </span>just a helpful calculator</span></div>
  </div>
  <div class="tabs" role="tablist" aria-label="Calculators">
    <button class="tab" role="tab" id="tab-land" aria-controls="panel-land" aria-selected="true" tabindex="0">LAND</button>
    <button class="tab" role="tab" id="tab-bmi" aria-controls="panel-bmi" aria-selected="false" tabindex="-1">BMI</button>
    <button class="tab" role="tab" id="tab-timezone" aria-controls="panel-timezone" aria-selected="false" tabindex="-1">TIMEZONE</button>
  </div>
</header>
<main class="app-main">
  <section class="panel" role="tabpanel" id="panel-land" aria-labelledby="tab-land">
  <h2 class="panel-title">Convert land measurements</h2>
  <p class="hint">Enter a value in any field.</p>
  <ul class="fields" id="fields"></ul>
  <section class="guide" aria-label="Land reference">
    <h2 class="guide-title">Reference</h2>
    <table class="guide-table">
      <thead>
        <tr><th scope="col">Perches</th><th scope="col">Square Meters</th><th scope="col">Ideal For</th></tr>
      </thead>
      <tbody>
        <tr><th scope="row">5&ndash;6</th><td>from 211.04 m&sup2;</td><td>Compact family home</td></tr>
        <tr><th scope="row">7&ndash;9</th><td>from 295.46 m&sup2;</td><td>Standard family property</td></tr>
        <tr><th scope="row">10</th><td>422.09 m&sup2;</td><td>Spacious family home</td></tr>
        <tr><th scope="row">12+</th><td>from 506.50 m&sup2;</td><td>Large residential property</td></tr>
      </tbody>
    </table>
    <h2 class="guide-title">Learn More</h2>
    <ul class="guide-blurbs">
      <li><strong>Square Meters (m&sup2;):</strong> The global standard for area.</li>
      <li><strong>Perche:</strong> The traditional Mauritian plot unit, standard for residential land.</li>
      <li><strong>Toise:</strong> An older unit from French records, still seen in legacy deeds.</li>
    </ul>
  </section>
  </section>
  <section class="panel" role="tabpanel" id="panel-bmi" aria-labelledby="tab-bmi" hidden>
  </section>
  <section class="panel" role="tabpanel" id="panel-timezone" aria-labelledby="tab-timezone" hidden>
    <h2 class="panel-title">Compare two time zones</h2>
    <p class="hint">Live now, or set a time.</p>
    <div class="tz-board">
      <section class="tz-card" aria-labelledby="tz-a-heading">
        <div class="tz-card-head">
          <h3 class="tz-card-title" id="tz-a-heading">HERE</h3>
          <span class="tz-badge" id="tz-a-badge" hidden>Detected</span>
        </div>
        <select class="tz-select" id="tz-zone-a" aria-label="HERE time zone"></select>
        <div class="tz-clock" id="tz-a-clock">
          <p class="tz-time"><time id="tz-a-time">--:--</time></p>
          <p class="tz-date" id="tz-a-date"></p>
        </div>
      </section>
      <section class="tz-card" aria-labelledby="tz-b-heading">
        <div class="tz-card-head">
          <h3 class="tz-card-title" id="tz-b-heading">THERE</h3>
          <span class="tz-badge" id="tz-b-badge" hidden>Detected</span>
        </div>
        <select class="tz-select" id="tz-zone-b" aria-label="THERE time zone"></select>
        <div class="tz-clock" id="tz-b-clock">
          <p class="tz-time"><time id="tz-b-time">--:--</time></p>
          <p class="tz-date" id="tz-b-date"></p>
        </div>
        <div class="tz-fixed" id="tz-b-fixed" hidden>
          <input class="tz-input" id="tz-date-b" type="date" aria-label="THERE date" autocomplete="off">
          <input class="tz-input" id="tz-time-b" type="time" step="60" aria-label="THERE time" autocomplete="off">
        </div>
      </section>
      <div class="tz-footer">
        <div class="tz-footer-text">
          <p class="tz-summary" id="tz-summary"></p>
          <p class="tz-note" id="tz-note" hidden></p>
        </div>
        <button class="tz-action tz-mode" id="tz-mode" type="button">SET TIME</button>
      </div>
    </div>
  </section>
  <p class="sr-only" aria-live="polite" id="live"></p>
</main>
<footer class="app-footer">
  <span class="footer-line">&copy; <span id="year"></span></span>
  <span class="footer-line">by <a href="${GITHUB_URL}" target="_blank" rel="noopener">wazeerc</a></span>
</footer>
`

const fieldsEl = document.querySelector('#fields')
const liveEl = document.querySelector('#live')
document.querySelector('#year').textContent = String(new Date().getFullYear())

const tabLand = document.querySelector('#tab-land')
const tabBmi = document.querySelector('#tab-bmi')
const tabTimezone = document.querySelector('#tab-timezone')
const tabs = [tabLand, tabBmi, tabTimezone]
const VALID_TABS = ['land', 'bmi', 'timezone']
const TAB_ORDER = ['land', 'bmi', 'timezone']
let activeTab = 'land'

function selectTab(id, focusTab, updateHash) {
  activeTab = id
  for (const tab of tabs) {
    const active = tab.id === 'tab-' + id
    tab.setAttribute('aria-selected', String(active))
    tab.tabIndex = active ? 0 : -1
    const panel = document.querySelector('#' + tab.getAttribute('aria-controls'))
    panel.hidden = !active
    if (active && focusTab) tab.focus()
  }
  if (updateHash && typeof location !== 'undefined' && location.hash !== '#' + id) {
    location.hash = '#' + id
  }
  if (id === 'timezone') {
    renderTimezone()
    startTzTimer()
  } else {
    stopTzTimer()
  }
}

function tabFromHash() {
  const hash = typeof location !== 'undefined' ? location.hash : ''
  const id = String(hash).replace(/^#/, '')
  return VALID_TABS.includes(id) ? id : 'land'
}

for (const tab of tabs) {
  tab.addEventListener('click', () => selectTab(tab.id.replace('tab-', ''), false, true))
  tab.addEventListener('keydown', (event) => {
    const i = tabs.indexOf(tab)
    let next = null
    if (event.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length]
    else if (event.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length]
    else if (event.key === 'Home') next = tabs[0]
    else if (event.key === 'End') next = tabs[tabs.length - 1]
    if (next) {
      if (typeof event.preventDefault === 'function') event.preventDefault()
      selectTab(next.id.replace('tab-', ''), true, true)
    }
  })
}

if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('hashchange', () => selectTab(tabFromHash(), false, false))
}

const mainEl = document.querySelector('.app-main')
const SWIPE_MIN_DX = 64
const SWIPE_MAX_DY = 80
let swipeTouch = null

function swipeStartInField(target) {
  return target instanceof Element && target.closest('.field, .tz-board') !== null
}

if (mainEl) {
  mainEl.addEventListener(
    'touchstart',
    (event) => {
      if (event.touches.length !== 1) {
        swipeTouch = null
        return
      }
      const touch = event.touches[0]
      swipeTouch = {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        dead: swipeStartInField(event.target),
      }
    },
    { passive: true },
  )
  mainEl.addEventListener(
    'touchend',
    (event) => {
      if (!swipeTouch) return
      const start = swipeTouch
      swipeTouch = null
      const touch = Array.from(event.changedTouches).find((t) => t.identifier === start.id)
      if (!touch || start.dead) return
      const dx = touch.clientX - start.x
      const dy = touch.clientY - start.y
      if (Math.abs(dx) < SWIPE_MIN_DX) return
      if (Math.abs(dy) > SWIPE_MAX_DY) return
      if (Math.abs(dy) > Math.abs(dx) / 2) return
      const index = TAB_ORDER.indexOf(activeTab)
      const nextIndex = dx < 0 ? Math.min(index + 1, TAB_ORDER.length - 1) : Math.max(index - 1, 0)
      if (nextIndex === index) return
      const next = TAB_ORDER[nextIndex]
      selectTab(next, false, true)
      const focused = document.activeElement
      const panel = focused && focused.closest('.panel')
      if (panel && panel.hidden) focused.blur()
      liveEl.textContent = next.toUpperCase() + ' panel.'
    },
    { passive: true },
  )
  mainEl.addEventListener('touchcancel', () => {
    swipeTouch = null
  })
}

const inputs = new Map()
for (const unit of UNITS) {
  const item = document.createElement('li')
  item.className = 'field'
  const label = document.createElement('label')
  label.className = 'field-label'
  label.htmlFor = 'field-' + unit.id
  label.textContent = unit.label
  const input = document.createElement('input')
  input.className = 'field-input'
  input.id = 'field-' + unit.id
  input.name = unit.id
  input.type = 'text'
  input.inputMode = 'decimal'
  input.autocomplete = 'off'
  input.autocorrect = 'off'
  input.spellcheck = false
  input.setAttribute('aria-label', unit.label)
  item.appendChild(label)
  item.appendChild(input)
  fieldsEl.appendChild(item)
  inputs.set(unit.id, input)
}

const timers = new Map()

function describe(sourceId, raw, values) {
  const source = UNITS.find((u) => u.id === sourceId)
  const parts = []
  for (const u of UNITS) {
    if (u.id === sourceId) continue
    parts.push(formatPlain(values[u.id]) + ' ' + u.label)
  }
  return String(raw).trim() + ' ' + source.label + ' equals ' + parts.join(', ')
}

function recalculate(sourceId, announce = true) {
  const sourceInput = inputs.get(sourceId)
  const raw = sourceInput.value
  const { values } = convert(sourceId, raw)
  for (const [id, input] of inputs) {
    if (id === sourceId) continue
    input.value = formatPlain(values[id])
  }
  if (!announce) {
    liveEl.textContent = ''
    return
  }
  if (activeTab !== 'land') return
  const parsed = parseInput(raw)
  liveEl.textContent = parsed.empty ? '' : describe(sourceId, raw, values)
}

function schedule(sourceId) {
  if (timers.has(sourceId)) clearTimeout(timers.get(sourceId))
  timers.set(
    sourceId,
    setTimeout(() => {
      timers.delete(sourceId)
      recalculate(sourceId)
    }, DEBOUNCE_MS),
  )
}

for (const [id, input] of inputs) {
  input.addEventListener('input', () => schedule(id))
  input.addEventListener('blur', () => {
    if (timers.has(id)) {
      clearTimeout(timers.get(id))
      timers.delete(id)
      recalculate(id)
    }
    const parsed = parseInput(input.value)
    if (!parsed.empty) input.value = formatPlain(parsed.value)
    else if (input.value.trim() !== '') input.value = ''
  })
}

const prefill = inputs.get('perche')
prefill.value = '100.00'
recalculate('perche', false)

const bmiPanel = document.querySelector('#panel-bmi')
bmiPanel.innerHTML = `
  <h2 class="panel-title">Check your BMI (adults 18+)</h2>
  <p class="hint">Enter age, weight, and height.</p>
  <ul class="fields bmi-fields" id="bmi-fields"></ul>
  <p class="bmi-result" id="bmi-result"></p>
  <ul class="bmi-bar" id="bmi-bar" aria-hidden="true"></ul>
  <p class="bmi-note" id="bmi-note" hidden></p>
  <p class="bmi-refused" id="bmi-refused" hidden></p>
  <section class="guide" aria-label="BMI reference">
    <h2 class="guide-title">Reference</h2>
    <p class="guide-intro">Body Mass Index (<a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC4890841/" target="_blank" rel="noopener">BMI</a>) is a measure of body fat based on height and weight. The bands below are the adult (20+) scale.</p>
    <table class="guide-table">
      <thead>
        <tr><th scope="col">BMI</th><th scope="col">Category</th></tr>
      </thead>
      <tbody id="bmi-ref-body"></tbody>
    </table>
  </section>
`

const BMI_FIELDS = [
  { id: 'age', label: 'Age (years)' },
  { id: 'weight', label: 'Weight (kg)' },
  { id: 'height', label: 'Height (cm)' },
]

const bmiFieldsEl = document.querySelector('#bmi-fields')
const bmiResultEl = document.querySelector('#bmi-result')
const bmiBarEl = document.querySelector('#bmi-bar')
const bmiNoteEl = document.querySelector('#bmi-note')
const bmiRefusedEl = document.querySelector('#bmi-refused')
const bmiRefBodyEl = document.querySelector('#bmi-ref-body')

for (const band of BANDS) {
  const row = document.createElement('tr')
  const range = document.createElement('th')
  range.setAttribute('scope', 'row')
  range.textContent = band.short
  const name = document.createElement('td')
  name.textContent = band.label
  row.appendChild(range)
  row.appendChild(name)
  bmiRefBodyEl.appendChild(row)
}
const bmiInputs = new Map()
const bmiBlocks = new Map()
for (const band of BANDS) {
  const block = document.createElement('li')
  block.className = 'bmi-block'
  block.textContent = band.short
  block.setAttribute('data-band', band.id)
  bmiBarEl.appendChild(block)
  bmiBlocks.set(band.id, block)
}

const QUALIFIED_NOTE = 'Note: the adult scale is approximate below age 20.'
const REFUSED_MESSAGE =
  'This calculator is for adults (18+). BMI for children and teens uses a different scale — please ask a doctor or pharmacist.'
for (const field of BMI_FIELDS) {
  const item = document.createElement('li')
  item.className = 'field'
  const label = document.createElement('label')
  label.className = 'field-label'
  label.htmlFor = 'bmi-' + field.id
  label.textContent = field.label
  const input = document.createElement('input')
  input.className = 'field-input'
  input.id = 'bmi-' + field.id
  input.name = field.id
  input.type = 'text'
  input.inputMode = 'decimal'
  input.autocomplete = 'off'
  input.autocorrect = 'off'
  input.spellcheck = false
  input.setAttribute('aria-label', field.label)
  item.appendChild(label)
  item.appendChild(input)
  bmiFieldsEl.appendChild(item)
  bmiInputs.set(field.id, input)
}

const BMI_PARSERS = { age: parseAge, weight: parseWeightKg, height: parseHeightCm }
const bmiTimers = new Map()
let lastBmiTriple = ''

function bmiTriple() {
  return [bmiInputs.get('age').value, bmiInputs.get('weight').value, bmiInputs.get('height').value].join('\n')
}

function recalculateBmi(announce = true) {
  lastBmiTriple = bmiTriple()
  const r = calculate(bmiInputs.get('age').value, bmiInputs.get('weight').value, bmiInputs.get('height').value)
  const showable = !r.empty && r.gate !== 'refused' && r.band !== null
  if (showable) {
    bmiResultEl.textContent = 'Your BMI is ' + formatBmi(r.bmi) + ' — ' + r.band.label
  } else {
    bmiResultEl.textContent = ''
  }
  for (const [id, block] of bmiBlocks) {
    block.className = showable && r.band.id === id ? 'bmi-block is-active' : 'bmi-block'
  }
  if (!r.empty && r.gate === 'qualified') {
    bmiNoteEl.textContent = QUALIFIED_NOTE
    bmiNoteEl.hidden = false
  } else {
    bmiNoteEl.textContent = ''
    bmiNoteEl.hidden = true
  }
  if (!r.empty && r.gate === 'refused') {
    bmiRefusedEl.textContent = REFUSED_MESSAGE
    bmiRefusedEl.hidden = false
  } else {
    bmiRefusedEl.textContent = ''
    bmiRefusedEl.hidden = true
  }
  if (!announce || activeTab !== 'bmi') return
  liveEl.textContent = bmiResultEl.textContent
}

function scheduleBmi(id) {
  if (bmiTimers.has(id)) clearTimeout(bmiTimers.get(id))
  bmiTimers.set(
    id,
    setTimeout(() => {
      bmiTimers.delete(id)
      recalculateBmi()
    }, DEBOUNCE_MS),
  )
}

for (const [id, input] of bmiInputs) {
  input.addEventListener('input', () => scheduleBmi(id))
  input.addEventListener('blur', () => {
    if (bmiTimers.has(id)) {
      clearTimeout(bmiTimers.get(id))
      bmiTimers.delete(id)
    }
    // Covers autofill and any value change that never fired an input event.
    if (bmiTriple() !== lastBmiTriple) recalculateBmi()
    // Per-field validity only: an incomplete form must never wipe a valid field.
    const parsed = BMI_PARSERS[id](input.value)
    if (parsed.empty) {
      if (input.value.trim() !== '') {
        input.value = ''
        if (bmiTriple() !== lastBmiTriple) recalculateBmi()
      }
    } else if (input.value.trim() !== String(parsed.value)) {
      input.value = String(parsed.value)
      if (bmiTriple() !== lastBmiTriple) recalculateBmi()
    }
  })
}

const tzZoneA = document.querySelector('#tz-zone-a')
const tzZoneB = document.querySelector('#tz-zone-b')
const tzATime = document.querySelector('#tz-a-time')
const tzBTime = document.querySelector('#tz-b-time')
const tzADate = document.querySelector('#tz-a-date')
const tzBDate = document.querySelector('#tz-b-date')
const tzBClock = document.querySelector('#tz-b-clock')
const tzBFixed = document.querySelector('#tz-b-fixed')
const tzDateB = document.querySelector('#tz-date-b')
const tzTimeB = document.querySelector('#tz-time-b')
const tzNote = document.querySelector('#tz-note')
const tzABadge = document.querySelector('#tz-a-badge')
const tzBBadge = document.querySelector('#tz-b-badge')
const tzSummary = document.querySelector('#tz-summary')
const tzMode = document.querySelector('#tz-mode')

const detectedZone = detectZone()
const initialZones = defaultZones(detectedZone)
const detectedCanonical = canonicalZone(groupZoneFor(detectedZone))
let tzState = {
  zoneA: groupZoneFor(initialZones.zoneA),
  zoneB: groupZoneFor(initialZones.zoneB),
  mode: 'live',
  sourceDate: '',
  sourceTime: '',
}
let tzBoard = null
let tzPickerSignature = ''
let tzSyncInputs = false
let tzTimer = null

function announceTz(message) {
  liveEl.textContent = message
}

function rebuildPicker(now) {
  const entries = pickerGroups(detectedZone)
  const signature = offsetSignature(entries, now)
  if (signature === tzPickerSignature) return
  const sorted = sortZoneEntries(entries, now)
  const active = document.activeElement
  const focusA = active === tzZoneA
  const focusB = active === tzZoneB
  for (const select of [tzZoneA, tzZoneB]) {
    select.replaceChildren()
    for (const entry of sorted) {
      const option = document.createElement('option')
      option.value = entry.zone
      option.textContent = formatZoneOption(entry)
      select.appendChild(option)
    }
  }
  tzZoneA.value = tzState.zoneA
  tzZoneB.value = tzState.zoneB
  if (focusA) tzZoneA.focus()
  else if (focusB) tzZoneB.focus()
  tzPickerSignature = signature
}

function renderZone(timeEl, dateEl, zoneBoard, zone, withYear) {
  if (!zoneBoard || !zoneBoard.parts) {
    timeEl.textContent = '--:--'
    timeEl.removeAttribute('datetime')
    timeEl.setAttribute('aria-label', 'No time to convert')
    dateEl.textContent = ''
    return
  }
  const parts = zoneBoard.parts
  const time = formatTime(parts)
  timeEl.textContent = time
  timeEl.setAttribute('datetime', formatInputDate(parts) + 'T' + time)
  timeEl.setAttribute('aria-label', cityForZone(zone) + ', ' + time + ', ' + formatDate(parts, true))
  dateEl.textContent = formatDate(parts, withYear)
}

function sourceNote(a) {
  const city = cityForZone(a.zone)
  if (a.adjusted) {
    return 'Adjusted forward to ' + formatTime(a.parts) + '; ' + city + ' skips that time.'
  }
  if (a.ambiguous) {
    return 'Occurs twice; using the first occurrence (' + formatOffset(a.offset) + ').'
  }
  return ''
}

function compactSummary(minutes, zoneA, zoneB) {
  const diff = Number(minutes) || 0
  if (!diff) return 'Same time'
  const absolute = Math.abs(diff)
  const hours = Math.floor(absolute / 60)
  const rest = absolute % 60
  const amount = hours ? hours + 'h' + (rest ? ' ' + rest + 'm' : '') : rest + 'm'
  return (
    cityForZone(zoneA) +
    ' is ' +
    amount +
    (diff > 0 ? ' behind ' : ' ahead of ') +
    cityForZone(zoneB)
  )
}

// In fixed mode THERE is the editable source and HERE is derived. The pure
// engine keeps its HERE-source contract, so swap the zones for the call and
// map the result back to the HERE/THERE cards.
function deriveUiBoard(state, now) {
  if (state.mode !== 'fixed') return deriveBoard(state, now)
  const source = deriveBoard({ ...state, zoneA: state.zoneB, zoneB: state.zoneA }, now)
  if (!source.valid) {
    return {
      mode: 'fixed',
      valid: false,
      a: { zone: state.zoneA, instant: null, parts: null },
      b: { zone: state.zoneB, instant: null, parts: null },
      summary: null,
    }
  }
  return {
    mode: 'fixed',
    valid: true,
    a: source.b,
    b: source.a,
    summary: { minutes: -source.summary.minutes },
  }
}

function renderTimezone() {
  const now = Date.now()
  rebuildPicker(now)
  const board = deriveUiBoard(tzState, now)
  tzBoard = board
  const fixed = tzState.mode === 'fixed'

  tzZoneA.value = tzState.zoneA
  tzZoneB.value = tzState.zoneB
  tzBClock.hidden = fixed
  tzBFixed.hidden = !fixed
  tzMode.textContent = fixed ? 'NOW' : 'SET TIME'

  if (fixed && tzSyncInputs) {
    tzDateB.value = tzState.sourceDate
    tzTimeB.value = tzState.sourceTime
  }
  tzSyncInputs = false

  renderZone(tzATime, tzADate, board.a, tzState.zoneA, fixed)
  renderZone(tzBTime, tzBDate, board.b, tzState.zoneB, false)

  tzSummary.textContent = board.valid
    ? compactSummary(board.summary.minutes, tzState.zoneA, tzState.zoneB)
    : 'Enter a valid date and time.'
  const note = fixed && board.valid ? sourceNote(board.b) : ''
  tzNote.textContent = note
  tzNote.hidden = !note

  tzABadge.hidden = !detectedCanonical || canonicalZone(tzState.zoneA) !== detectedCanonical
  tzBBadge.hidden = !detectedCanonical || canonicalZone(tzState.zoneB) !== detectedCanonical
}

function setTime() {
  if (tzState.mode === 'live') {
    const frozen =
      tzBoard && tzBoard.valid && tzBoard.b && tzBoard.b.parts
        ? tzBoard.b.parts
        : deriveBoard(tzState, Date.now()).b.parts
    tzState.mode = 'fixed'
    tzState.sourceDate = formatInputDate(frozen)
    tzState.sourceTime = formatInputTime(frozen)
    tzSyncInputs = true
    renderTimezone()
    announceTz(
      'Fixed time mode. THERE is ' +
        formatTime(frozen) +
        ' on ' +
        formatDate(frozen, true) +
        ' in ' +
        cityForZone(tzState.zoneB) +
        '.',
    )
    return
  }
  tzState.mode = 'live'
  const board = deriveUiBoard(tzState, Date.now())
  tzState.sourceDate = formatInputDate(board.b.parts)
  tzState.sourceTime = formatInputTime(board.b.parts)
  tzSyncInputs = true
  renderTimezone()
  announceTz('Live mode.')
}

function updateSource() {
  tzState.sourceDate = tzDateB.value
  tzState.sourceTime = tzTimeB.value
  renderTimezone()
}

function commitSource() {
  tzState.sourceDate = tzDateB.value
  tzState.sourceTime = tzTimeB.value
  const board = deriveUiBoard(tzState, Date.now())
  if (board.valid && !board.b.adjusted && !board.b.ambiguous) {
    tzState.sourceDate = formatInputDate(board.b.parts)
    tzState.sourceTime = formatInputTime(board.b.parts)
    tzSyncInputs = true
  }
  renderTimezone()
  if (!board.valid) {
    announceTz('Enter a valid date and time in THERE.')
    return
  }
  announceTz(
    'THERE is ' +
      formatTime(board.b.parts) +
      ' on ' +
      formatDate(board.b.parts, true) +
      ' in ' +
      cityForZone(tzState.zoneB) +
      '; HERE is ' +
      formatTime(board.a.parts) +
      ' on ' +
      formatDate(board.a.parts, true) +
      ' in ' +
      cityForZone(tzState.zoneA) +
      '.',
  )
}

tzZoneA.addEventListener('change', () => {
  tzState.zoneA = tzZoneA.value
  renderTimezone()
  announceTz('HERE set to ' + cityForZone(tzState.zoneA) + '.')
})

tzZoneB.addEventListener('change', () => {
  tzState.zoneB = tzZoneB.value
  renderTimezone()
  announceTz('THERE set to ' + cityForZone(tzState.zoneB) + '.')
})

tzMode.addEventListener('click', setTime)
tzDateB.addEventListener('input', updateSource)
tzTimeB.addEventListener('input', updateSource)
tzDateB.addEventListener('change', commitSource)
tzTimeB.addEventListener('change', commitSource)

function stopTzTimer() {
  if (tzTimer !== null) {
    clearTimeout(tzTimer)
    tzTimer = null
  }
}

function startTzTimer() {
  stopTzTimer()
  const tick = () => {
    if (activeTab !== 'timezone' || document.hidden) return
    renderTimezone()
    tzTimer = setTimeout(tick, 60000 - (Date.now() % 60000) + 20)
  }
  tzTimer = setTimeout(tick, 60000 - (Date.now() % 60000) + 20)
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopTzTimer()
  } else if (activeTab === 'timezone') {
    renderTimezone()
    startTzTimer()
  }
})

window.addEventListener('focus', () => {
  if (activeTab === 'timezone') {
    renderTimezone()
    startTzTimer()
  }
})

renderTimezone()
selectTab(tabFromHash(), false, false)

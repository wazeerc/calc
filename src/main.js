import './style.css'
import { UNITS, convert, parseInput, formatPlain } from './converter.js'
import { BANDS, calculate, formatBmi, parseAge, parseWeightKg, parseHeightCm } from './bmi.js'

const DEBOUNCE_MS = 200
const GITHUB_URL = 'https://github.com/wazeerc'

const app = document.querySelector('#app')

app.innerHTML = `
<header class="app-header">
  <div class="header-row">
    <div class="brand"><h1>CALC</h1><span class="tagline"><span aria-hidden="true">— </span>just a helpful calculator</span></div>
    <div class="tabs" role="tablist" aria-label="Calculators">
      <button class="tab" role="tab" id="tab-land" aria-controls="panel-land" aria-selected="true" tabindex="0">LAND</button>
      <button class="tab" role="tab" id="tab-bmi" aria-controls="panel-bmi" aria-selected="false" tabindex="-1">BMI</button>
    </div>
  </div>
</header>
<main class="app-main">
  <section class="panel" role="tabpanel" id="panel-land" aria-labelledby="tab-land">
  <h2 class="panel-title">Convert land measurements</h2>
  <p class="hint">Type a value in any field. Other units update automatically.</p>
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
      <li><strong>Square Meters (m&sup2;):</strong> The global standard for area. Recognized in Mauritius.</li>
      <li><strong>Perche:</strong> The traditional Mauritian plot unit. 1 perch is about 42.21 m&sup2;, standard for residential land.</li>
      <li><strong>Toise:</strong> An older unit from French records. 1 toise is about 3.80 m&sup2;; still seen in legacy deeds.</li>
      <li><strong>Arpent:</strong> The large Mauritian unit. 1 arpent is 100 perches, about 4,220.87 m&sup2;.</li>
    </ul>
  </section>
  </section>
  <section class="panel" role="tabpanel" id="panel-bmi" aria-labelledby="tab-bmi" hidden>
  </section>
  <p class="sr-only" aria-live="polite" id="live"></p>
</main>
<footer class="app-footer">
  <span class="footer-line">&copy; <span id="year"></span></span>
  <span class="footer-line">An open-source project by <a href="${GITHUB_URL}" target="_blank" rel="noopener">wazeerc</a></span>
</footer>
`

const fieldsEl = document.querySelector('#fields')
const liveEl = document.querySelector('#live')
document.querySelector('#year').textContent = String(new Date().getFullYear())

const tabLand = document.querySelector('#tab-land')
const tabBmi = document.querySelector('#tab-bmi')
const tabs = [tabLand, tabBmi]
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
}

const VALID_TABS = ['land', 'bmi']

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
selectTab(tabFromHash(), false, false)

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
  <p class="hint">Enter age, weight, and height. BMI updates automatically. Metric only.</p>
  <ul class="fields bmi-fields" id="bmi-fields"></ul>
  <p class="bmi-result" id="bmi-result"></p>
  <ul class="bmi-bar" id="bmi-bar" aria-hidden="true"></ul>
  <p class="bmi-note" id="bmi-note" hidden></p>
  <p class="bmi-refused" id="bmi-refused" hidden></p>
  <section class="guide" aria-label="BMI reference">
    <h2 class="guide-title">Reference</h2>
    <p class="guide-intro">BMI is weight in kilograms divided by height in meters squared. The bands below are the adult (20+) scale.</p>
    <table class="guide-table">
      <thead>
        <tr><th scope="col">BMI</th><th scope="col">Category</th></tr>
      </thead>
      <tbody id="bmi-ref-body"></tbody>
    </table>
    <p class="guide-outbound"><a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC4890841/" target="_blank" rel="noopener">Learn more about BMI — National Library of Medicine</a></p>
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

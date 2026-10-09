import './style.css'
import { UNITS, convert, parseInput, formatPlain } from './converter.js'

const DEBOUNCE_MS = 200
const GITHUB_URL = 'https://github.com/wazeerc/calc'

const app = document.querySelector('#app')

app.innerHTML = `
<header class="app-header">
  <h1>CALC</h1>
</header>
<main class="app-main">
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
  <p class="sr-only" aria-live="polite" id="live"></p>
</main>
<footer class="app-footer">
  <span>&copy; <span id="year"></span> <a href="${GITHUB_URL}" target="_blank" rel="noopener">wazeerc</a></span>
</footer>
`

const fieldsEl = document.querySelector('#fields')
const liveEl = document.querySelector('#live')
document.querySelector('#year').textContent = String(new Date().getFullYear())

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

import { simulate, abs2, fidelity, concurrence, TAU } from './optics.js';

const $ = id => document.getElementById(id);
const inputs = {
  cnot: [['plus0', '|+0⟩\u2002Superposition'], ['10', '|10⟩\u2002Observe the bit flip'], ['11', '|11⟩\u2002Observe the reverse flip'], ['00', '|00⟩\u2002Unchanged'], ['01', '|01⟩\u2002Unchanged'], ['plus1', '|+1⟩\u2002Superposition'], ['uniform', '|++⟩\u2002Equal superposition']],
  mzi: [['0', '|0⟩\u2002Upper rail'], ['1', '|1⟩\u2002Lower rail'], ['plus', '|+⟩\u2002In-phase superposition'], ['minus', '|−⟩\u2002Opposite-phase superposition']]
};
const stageLabels = { cnot: ['Input', 'After the first H', 'After the Kerr interaction', 'Output'], mzi: ['Input', 'After the first BS', 'After the phase shifter', 'Output'] };
const settings = { cnot: { input: 'plus0', phi: Math.PI }, mzi: { input: '0', phi: Math.PI / 2 } };
let mode = 'cnot', theta = Math.PI / 4, stage = 3, snapshot;
let playing = false, frame, previousTime = null;
const clean = x => Math.abs(x) < 0.00005 ? 0 : x;
function angleLabel(x) {
  for (const [value, name] of [[0, '0'], [Math.PI / 4, 'π/4'], [Math.PI / 2, 'π/2'], [Math.PI, 'π'], [3 * Math.PI / 2, '3π/2'], [TAU, '2π']]) {
    if (Math.abs(x - value) < 1e-6) return `${name} rad`;
  }
  return `${(x / Math.PI).toFixed(3)}π rad`;
}
function complexLabel(a) {
  const re = clean(a[0]), im = clean(a[1]);
  if (!im) return re.toFixed(3);
  if (!re) return `${im.toFixed(3)}i`;
  return `${re.toFixed(3)}${im < 0 ? '−' : '+'}${Math.abs(im).toFixed(3)}i`;
}
const labels = () => mode === 'cnot' ? ['|00⟩', '|01⟩', '|10⟩', '|11⟩'] : ['|0⟩', '|1⟩'];
function options() { return { mode, input: settings[mode].input, phi: settings[mode].phi, theta }; }
function makeBars() {
  $('probability-bars').innerHTML = labels().map(label => `<div class="bar-item"><span class="ket">${label}</span><div class="bar-bg"><div class="bar-fill"></div></div><span class="val">—</span></div>`).join('');
}
function updateBars(probs) {
  [...$('probability-bars').children].forEach((row, i) => {
    row.querySelector('.bar-fill').style.width = `${Math.max(0, 100 * probs[i])}%`;
    row.querySelector('.val').textContent = `${(100 * probs[i]).toFixed(1)}%`;
  });
}
function drawCircuit() {
  const rail = (y, text, color = false) => `<text x="18" y="${y + 5}" class="svg-ket">${text}</text><line x1="86" y1="${y}" x2="560" y2="${y}" class="rail ${color ? 'active' : ''}"/><circle cx="570" cy="${y}" r="8" fill="#1c3044" stroke="#77b5e3"/>`;
  const mark = [96, 228, 374, 535][stage];
  let body;
  if (mode === 'cnot') {
    body = [rail(48, 'C : 0'), rail(94, 'C : 1'), rail(158, 'T : 1'), rail(204, 'T : 0')].join('') + `
      <rect x="151" y="140" width="55" height="82" rx="8" class="optical-box"/><text x="178" y="186" text-anchor="middle" class="svg-label">H</text>
      <rect x="283" y="76" width="68" height="100" rx="8" class="kerr-box"/><text x="317" y="117" text-anchor="middle" class="svg-label">Kerr</text><text x="317" y="140" text-anchor="middle" class="svg-small">ξ = χL</text>
      <rect x="427" y="140" width="55" height="82" rx="8" class="optical-box"/><text x="454" y="186" text-anchor="middle" class="svg-label">H</text>
      <text x="317" y="246" text-anchor="middle" class="svg-small">Both middle modes occupied → phase eⁱξ on |11⟩</text>`;
  } else {
    body = rail(85, '|0⟩', true) + rail(185, '|1⟩', true) + `
      <rect x="150" y="68" width="56" height="134" rx="8" class="optical-box"/><text x="178" y="125" text-anchor="middle" class="svg-label">BS</text><text x="178" y="148" text-anchor="middle" class="svg-small">θ</text>
      <rect x="285" y="166" width="64" height="38" rx="8" class="kerr-box"/><text x="317" y="190" text-anchor="middle" class="svg-label">P(φ)</text>
      <rect x="426" y="68" width="56" height="134" rx="8" class="optical-box"/><text x="454" y="125" text-anchor="middle" class="svg-label">BS⁻¹</text><text x="454" y="148" text-anchor="middle" class="svg-small">−θ</text>
      <text x="317" y="246" text-anchor="middle" class="svg-small">Shift the phase in one rail, then recombine the two paths</text>`;
  }
  $('circuit').innerHTML = `<svg viewBox="0 0 600 268" role="img" aria-label="${mode === 'cnot' ? 'Four-rail optical CNOT circuit: H on the target, Kerr on the middle two rails, then H on the target.' : 'Two-rail interferometer: beam splitter, phase shifter on the lower rail, then inverse beam splitter.'} The green dashed line marks the observation point."><line x1="${mark}" x2="${mark}" y1="23" y2="224" stroke="#6bd9ad" stroke-dasharray="4 5" opacity=".65"/><circle cx="${mark}" cy="16" r="3" fill="#6bd9ad"/>${body}</svg>`;
}
function drawChart() {
  const canvas = $('chart'), ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2), w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); ctx.scale(dpr, dpr);
  const left = 40, right = w - 14, top = 18, bottom = h - 31;
  const sx = x => left + x / TAU * (right - left), sy = y => bottom - y * (bottom - top);
  ctx.font = '10px system-ui'; ctx.lineWidth = 1;
  for (const y of [0, .25, .5, .75, 1]) {
    ctx.strokeStyle = '#24364c'; ctx.beginPath(); ctx.moveTo(left, sy(y)); ctx.lineTo(right, sy(y)); ctx.stroke();
    ctx.fillStyle = '#9bafc7'; ctx.textAlign = 'right'; ctx.fillText(`${y * 100}%`, left - 7, sy(y) + 3);
  }
  for (const [x, label] of [[0, '0'], [Math.PI / 2, 'π/2'], [Math.PI, 'π'], [3 * Math.PI / 2, '3π/2'], [TAU, '2π']]) {
    ctx.fillStyle = '#9bafc7'; ctx.textAlign = 'center'; ctx.fillText(label, sx(x), bottom + 19);
  }
  const colors = ['#6bd9ad', '#6facfa'];
  for (let j = 0; j < 2; j++) {
    ctx.beginPath(); ctx.strokeStyle = colors[j]; ctx.lineWidth = 2;
    for (let i = 0; i <= 120; i++) {
      const x = i * TAU / 120, s = simulate({ ...options(), phi: x });
      const y = mode === 'cnot' ? (j === 0 ? s.fidelity : s.probabilities[3]) : s.probabilities[j];
      if (i === 0) ctx.moveTo(sx(x), sy(y)); else ctx.lineTo(sx(x), sy(y));
    }
    ctx.stroke();
  }
  const phi = settings[mode].phi;
  ctx.strokeStyle = '#b59afa'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(sx(phi), top); ctx.lineTo(sx(phi), bottom); ctx.stroke(); ctx.setLineDash([]);
  const values = mode === 'cnot' ? [snapshot.fidelity, snapshot.probabilities[3]] : snapshot.probabilities;
  values.forEach((y, i) => { ctx.fillStyle = colors[i]; ctx.beginPath(); ctx.arc(sx(phi), sy(y), 3.5, 0, TAU); ctx.fill(); });
}
function refresh() {
  try {
    snapshot = simulate(options());
    const state = snapshot.stages[stage], probs = state.map(abs2);
    $('phase-value').textContent = angleLabel(settings[mode].phi);
    $('phase').setAttribute('aria-valuetext', angleLabel(settings[mode].phi));
    $('theta-value').textContent = angleLabel(theta);
    $('theta').setAttribute('aria-valuetext', angleLabel(theta));
    $('stage-name').textContent = stageLabels[mode][stage];
    document.querySelectorAll('[data-stage]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.stage) === stage)));
    $('stat1').textContent = mode === 'cnot' ? `${(100 * fidelity(state, snapshot.ideal)).toFixed(2)}%` : `${(100 * probs[0]).toFixed(2)}%`;
    let relativePhase = abs2(state[0]) > 1e-10 && abs2(state[1]) > 1e-10 ? Math.atan2(state[1][1], state[1][0]) - Math.atan2(state[0][1], state[0][0]) : null;
    if (relativePhase !== null) relativePhase = Math.atan2(Math.sin(relativePhase), Math.cos(relativePhase));
    $('stat2').textContent = mode === 'cnot' ? concurrence(state).toFixed(3) : relativePhase === null ? '—' : `${clean(relativePhase / Math.PI).toFixed(2)}π`;
    $('state-vector').innerHTML = state.map((a, i) => `<div class="amplitude ${abs2(a) < 1e-10 ? 'zero' : ''}"><span class="ket">${labels()[i]}</span><strong>${complexLabel(a)}</strong><div class="phase-track" aria-hidden="true"><i style="width:${Math.min(100, 100 * abs2(a))}%"></i></div></div>`).join('');
    if (mode === 'cnot') {
      const c = concurrence(state);
      $('observation').textContent = stage !== 3 ? `State: ${stageLabels[mode][stage]}. Fidelity compares this state with the ideal final CNOT output.` : c > .999 ? 'This state is maximally entangled. Explore the relative phases of its complex amplitudes as well as its measurement probabilities.' : Math.abs(settings[mode].phi - Math.PI) < 1e-6 ? 'ξ = π: the circuit implements CNOT. The target flips only when the control is |1⟩.' : 'The final H converts the Kerr conditional phase into a change in the target measurement probabilities.';
    } else {
      $('observation').textContent = stage !== 3 ? `State: ${stageLabels[mode][stage]}. The phase shifter preserves rail populations but affects interference after recombination.` : 'The amplitudes in the two rails recombine and interfere. Relative phase is shown only when both amplitudes are nonzero.';
    }
    updateBars(probs); drawCircuit(); drawChart(); $('error').textContent = '';
  } catch (error) { $('error').textContent = `Unable to display the simulation: ${error.message}`; }
}
function stop() {
  playing = false; previousTime = null; cancelAnimationFrame(frame);
  $('play').textContent = '▶ Sweep phase'; $('play').setAttribute('aria-pressed', 'false');
}
function setMode(next) {
  stop(); mode = next; stage = 3;
  document.querySelectorAll('[data-mode]').forEach(b => { b.setAttribute('aria-selected', String(b.dataset.mode === mode)); b.tabIndex = b.dataset.mode === mode ? 0 : -1; });
  $('experiment').setAttribute('aria-labelledby', `tab-${mode}`);
  $('input').replaceChildren(...inputs[mode].map(([value, text]) => new Option(text, value)));
  $('input').value = settings[mode].input; $('phase').value = settings[mode].phi;
  $('theta-control').hidden = mode !== 'mzi';
  $('phase-label').textContent = mode === 'cnot' ? 'Kerr interaction ξ = χL' : 'Relative phase φ';
  const symbol = mode === 'cnot' ? 'ξ' : 'φ';
  [['zero', '0'], ['half', 'π/2'], ['pi', 'π']].forEach(([id, value]) => $(id).textContent = `${symbol} = ${value}`);
  $('stat1-label').textContent = mode === 'cnot' ? 'State fidelity with ideal CNOT output' : 'Upper-rail probability P(0)';
  $('stat2-label').textContent = mode === 'cnot' ? 'Entanglement · concurrence' : 'Lower-rail relative phase';
  $('prob-note').textContent = mode === 'cnot' ? 'Use the fidelity above to check agreement with the ideal logical CNOT output at ξ = π.' : 'The probabilities describe the state at the selected observation point in the interferometer.';
  $('photon-count').textContent = mode === 'cnot' ? '2' : '1';
  $('photon-badge').textContent = mode === 'cnot' ? '2 PHOTONS · 4 MODES' : '1 PHOTON · 2 MODES';
  const names = mode === 'cnot' ? ['Input', 'After H', 'After Kerr', 'Output'] : ['Input', 'After BS', 'After P', 'Output'];
  document.querySelectorAll('[data-stage]').forEach((b, i) => b.textContent = names[i]);
  $('encoding').innerHTML = mode === 'cnot' ? '|00⟩<sub>L</sub> = |1001⟩<br>|01⟩<sub>L</sub> = |1010⟩<br>|10⟩<sub>L</sub> = |0101⟩<br>|11⟩<sub>L</sub> = |0110⟩<div class="formula-line">U = (I ⊗ H) K(ξ) (I ⊗ H)</div><div class="math-caption">The four digits give the photon count in each rail, from top to bottom.</div>' : '|0⟩<sub>L</sub> = |01⟩<br>|1⟩<sub>L</sub> = |10⟩<div class="formula-line">U = B(−θ) P(φ) B(θ)</div><div class="math-caption">Logical |0⟩ is the upper rail; |1⟩ is the lower rail. Two-digit Fock notation uses (lower, upper) order.</div>';
  $('control-note').textContent = mode === 'cnot' ? 'At ξ = π, CNOT turns |+0⟩ into a Bell state. Each H uses a 50:50 beam splitter and a π phase shifter.' : 'θ = π/4 gives a 50:50 splitter. Input |0⟩ exits the original rail at φ = 0 and the opposite rail at φ = π.';
  $('circuit-caption').textContent = mode === 'cnot' ? 'C = control, T = target. Rails run top to bottom as C:0, C:1, T:1, T:0. Select a point to inspect the state along the circuit.' : 'BS mixes the rails; P shifts the phase in the lower rail. The displayed state is at the green dashed line.';
  const legendNames = mode === 'cnot' ? ['Fidelity with ideal CNOT output', 'P(11)'] : ['P(0)', 'P(1)'];
  $('chart-legend').innerHTML = legendNames.map((name, i) => `<span><i class="dot" style="background:${i ? 'var(--accent)' : 'var(--green)'}"></i>${name}</span>`).join('') + '<span><i class="dot" style="background:var(--violet)"></i>Current phase</span>';
  $('chart-note').textContent = `Final output as ${symbol} varies with the input fixed. This plot always shows the state after the last optical element, regardless of the selected observation point.`;
  makeBars(); refresh();
}
document.querySelectorAll('[data-mode]').forEach(b => {
  b.addEventListener('click', () => setMode(b.dataset.mode));
  b.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault(); const next = e.key === 'Home' ? 'cnot' : e.key === 'End' ? 'mzi' : mode === 'cnot' ? 'mzi' : 'cnot';
    setMode(next); $(`tab-${next}`).focus();
  });
});
$('input').addEventListener('change', () => { stop(); settings[mode].input = $('input').value; refresh(); });
$('phase').addEventListener('input', () => { stop(); settings[mode].phi = Math.max(0, Math.min(TAU, Number($('phase').value))); refresh(); });
$('theta').addEventListener('input', () => { stop(); theta = Math.max(0, Math.min(Math.PI / 2, Number($('theta').value))); refresh(); });
for (const [id, value] of [['zero', 0], ['half', Math.PI / 2], ['pi', Math.PI]]) $(id).addEventListener('click', () => { stop(); settings[mode].phi = value; $('phase').value = value; refresh(); });
document.querySelectorAll('[data-stage]').forEach(b => b.addEventListener('click', () => { stop(); stage = Number(b.dataset.stage); refresh(); }));
$('reset').addEventListener('click', () => {
  settings[mode] = mode === 'cnot' ? { input: 'plus0', phi: Math.PI } : { input: '0', phi: Math.PI / 2 };
  if (mode === 'mzi') { theta = Math.PI / 4; $('theta').value = theta; }
  setMode(mode);
});
$('play').addEventListener('click', () => {
  if (playing) { stop(); return; }
  playing = true; previousTime = null;
  $('play').textContent = 'Ⅱ Pause phase sweep'; $('play').setAttribute('aria-pressed', 'true');
  const tick = time => {
    if (!playing) return;
    if (previousTime !== null) settings[mode].phi = (settings[mode].phi + Math.min(100, time - previousTime) * TAU / 12000) % TAU;
    previousTime = time; $('phase').value = settings[mode].phi; refresh(); frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
});
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
window.addEventListener('resize', () => { if (snapshot) drawChart(); });
setMode('cnot');

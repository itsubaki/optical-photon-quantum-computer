import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate, inputState, beamSplitter, fidelity, concurrence, abs2 } from '../public/optics.js';

const near = (actual, expected, epsilon = 1e-12) => assert.ok(Math.abs(actual - expected) < epsilon, `${actual} ≠ ${expected}`);
const sameState = (a, b) => near(fidelity(a, b), 1);

test('Kerr at π implements the full CNOT truth table', () => {
  for (const [input, target] of [['00', '00'], ['01', '01'], ['10', '11'], ['11', '10']]) {
    const result = simulate({ input, phi: Math.PI });
    sameState(result.output, inputState('cnot', target));
    near(result.probabilities[parseInt(target, 2)], 1);
  }
});

test('CNOT superposition amplitudes agree, including relative phases', () => {
  for (const input of ['plus0', 'plus1', 'uniform']) {
    const result = simulate({ input, phi: Math.PI });
    sameState(result.output, result.ideal);
    near(result.fidelity, 1);
  }
  const bell = simulate();
  sameState(bell.output, [[Math.SQRT1_2, 0], [0, 0], [0, 0], [Math.SQRT1_2, 0]]);
  near(bell.concurrence, 1);
});

test('zero Kerr and 2π Kerr are identity on every selectable input', () => {
  for (const input of ['00', '01', '10', '11', 'plus0', 'plus1', 'uniform']) {
    sameState(simulate({ input, phi: 0 }).output, inputState('cnot', input));
    sameState(simulate({ input, phi: 2 * Math.PI }).output, inputState('cnot', input));
  }
});

test('Bell-input Kerr response and entanglement match analytic solutions', () => {
  for (let i = 0; i <= 32; i++) {
    const phi = 2 * Math.PI * i / 32;
    const result = simulate({ input: 'plus0', phi });
    near(result.probabilities[0], .5);
    near(result.probabilities[3], .5 * Math.sin(phi / 2) ** 2);
    near(result.concurrence, Math.abs(Math.sin(phi / 2)));
  }
});

test('balanced MZI returns photon at zero phase, switches at π', () => {
  for (const input of ['0', '1']) {
    sameState(simulate({ mode: 'mzi', input, phi: 0 }).output, inputState('mzi', input));
    near(simulate({ mode: 'mzi', input, phi: Math.PI }).probabilities[1 - Number(input)], 1);
  }
});

test('unbalanced MZI follows sin²(2θ) sin²(φ/2)', () => {
  for (const theta of [0, .13, Math.PI / 4, .97, Math.PI / 2]) {
    for (const phi of [0, .71, Math.PI / 2, Math.PI, 4.9, 2 * Math.PI]) {
      const result = simulate({ mode: 'mzi', input: '0', phi, theta });
      near(result.probabilities[1], Math.sin(2 * theta) ** 2 * Math.sin(phi / 2) ** 2);
    }
  }
});

test('every stage is normalized and phase elements preserve populations', () => {
  for (const mode of ['cnot', 'mzi']) {
    const names = mode === 'cnot' ? ['00', '01', '10', '11', 'plus0', 'plus1', 'uniform'] : ['0', '1', 'plus', 'minus'];
    for (const input of names) for (const phi of [0, .37, Math.PI, 5.28]) {
      const s = simulate({ mode, input, phi, theta: .43 });
      for (const state of s.stages) near(state.reduce((p, a) => p + abs2(a), 0), 1);
      s.stages[1].forEach((a, i) => near(abs2(a), abs2(s.stages[2][i])));
    }
  }
});

test('BS inverse restores a complex superposition and fidelity ignores global phase', () => {
  const state = [[Math.SQRT1_2, 0], [0, Math.SQRT1_2]];
  sameState(beamSplitter(beamSplitter(state, .71), -.71), state);
  near(fidelity(state, state.map(a => [-a[1], a[0]])), 1);
  near(concurrence([[.5, 0], [.5, 0], [.5, 0], [.5, 0]]), 0);
});

test('invalid simulation parameters and inputs are rejected', () => {
  assert.throws(() => simulate({ phi: NaN }), RangeError);
  assert.throws(() => inputState('cnot', 'missing'), RangeError);
});

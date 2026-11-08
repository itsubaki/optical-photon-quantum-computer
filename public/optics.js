// Complex amplitudes are [real, imaginary]. Logical basis order: 00, 01, 10, 11.
export const TAU = 2 * Math.PI;
export const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const scale = (a, s) => [a[0] * s, a[1] * s];
export const multiply = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
export const abs2 = a => a[0] ** 2 + a[1] ** 2;
export const phase = (a, phi) => multiply(a, [Math.cos(phi), Math.sin(phi)]);

const S = Math.SQRT1_2;

const INPUTS = {
  cnot: { '00': [1, 0, 0, 0], '01': [0, 1, 0, 0], '10': [0, 0, 1, 0], '11': [0, 0, 0, 1], plus0: [S, 0, S, 0], plus1: [0, S, 0, S], uniform: [.5, .5, .5, .5] },
  mzi: { '0': [1, 0], '1': [0, 1], plus: [S, S], minus: [S, -S] }
};

export function inputState(mode, name) {
  const values = INPUTS[mode]?.[name];
  if (!values) throw new RangeError('Unknown input state');
  return values.map(x => [x, 0]);
}

// Eq. (7.35), taking its explicit real matrix as the convention:
// B(theta) = [[cos(theta), -sin(theta)], [sin(theta), cos(theta)]].
export function beamSplitter(state, theta) {
  const c = Math.cos(theta), s = Math.sin(theta);
  return [add(scale(state[0], c), scale(state[1], -s)), add(scale(state[0], s), scale(state[1], c))];
}

export function hadamardTarget(state) {
  return [scale(add(state[0], state[1]), S), scale(add(state[0], scale(state[1], -1)), S), scale(add(state[2], state[3]), S), scale(add(state[2], scale(state[3], -1)), S)];
}

export function fidelity(a, b) {
  let re = 0, im = 0;
  a.forEach((v, i) => { re += v[0] * b[i][0] + v[1] * b[i][1]; im += v[0] * b[i][1] - v[1] * b[i][0]; });
  return Math.min(1, Math.max(0, re * re + im * im));
}

export function concurrence(state) {
  const a = multiply(state[0], state[3]), b = multiply(state[1], state[2]);
  return Math.min(1, 2 * Math.hypot(a[0] - b[0], a[1] - b[1]));
}

export function simulate({ mode = 'cnot', input = 'plus0', phi = Math.PI, theta = Math.PI / 4 } = {}) {
  if (!['cnot', 'mzi'].includes(mode) || !Number.isFinite(phi) || !Number.isFinite(theta)) throw new RangeError('Invalid simulation parameters');
  const initial = inputState(mode, input);

  let stages, ideal;
  if (mode === 'cnot') {
    const first = hadamardTarget(initial);
    const kerr = first.map((v, i) => i === 3 ? phase(v, phi) : [...v]);
    stages = [initial, first, kerr, hadamardTarget(kerr)];
    ideal = [initial[0], initial[1], initial[3], initial[2]];
  } else {
    const first = beamSplitter(initial, theta);
    const shifted = [[...first[0]], phase(first[1], phi)];
    stages = [initial, first, shifted, beamSplitter(shifted, -theta)];
    ideal = initial;
  }

  const output = stages[3];
  return { stages, output, ideal, probabilities: output.map(abs2), fidelity: fidelity(output, ideal), concurrence: mode === 'cnot' ? concurrence(output) : null };
}

// Each sample represents a fresh preparation measured in the logical basis.
export function sample(probabilities, shots, random = Math.random) {
  if (!Number.isInteger(shots) || shots < 1 || shots > 100000) throw new RangeError('Invalid shot count');
  const total = probabilities.reduce((a, p) => a + p, 0);

  if (!probabilities.length || probabilities.some(p => !Number.isFinite(p) || p < 0) || Math.abs(total - 1) > 1e-9) throw new RangeError('Probabilities must sum to one');
  const counts = probabilities.map(() => 0);

  for (let n = 0; n < shots; n++) {
    let r = random();
    if (!(r >= 0 && r < 1)) throw new RangeError('Random value must be in [0,1)');

    let chosen = probabilities.length - 1;
    for (let i = 0; i < probabilities.length; i++) { r -= probabilities[i]; if (r < 0) { chosen = i; break; } }

    counts[chosen]++;
  }

  return counts;
}

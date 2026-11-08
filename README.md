# Optical Photon Quantum Computer

An HTML, CSS, and JavaScript simulator based on §7.4 of Nielsen & Chuang, *Quantum Computation and Quantum Information*. Its dark theme, panels, and settings/visualization layout follow the neighboring `harmonic-oscillator-quantum-computer` project.

## Run locally

Requires Python 3 and Make. No external packages need to be installed.

```sh
make run
```

Open [http://127.0.0.1:3001](http://127.0.0.1:3001). To change the port, use `make run PORT=3002`.

The command serves only the `public` directory using Python's built-in HTTP server:

```sh
python3 -m http.server 3001 --bind 127.0.0.1 --directory public
```

## Experiments

- **Two-photon CNOT** — H on the target, a Kerr interaction on the two middle modes, then H on the target again. At ξ = χL = π, this implements CNOT. Input `|+0⟩` produces a Bell state.
- **Single-photon interference** — A Mach–Zehnder arrangement, `B(−θ) P(φ) B(θ)`. Adjust the relative phase and beam-splitter mixing angle to explore output interference.
- **Intermediate states** — Inspect complex amplitudes and logical-basis probabilities at the input, after the first BS/H, after P/Kerr, and at the output.
- **Measurements** — Take one or 1,000 independent Born-rule samples, each from a fresh preparation of the state at the selected point. Changing the input, phase, mixing angle, or observation point clears the history. Measurement collapse is not propagated through the remaining circuit.
- **Phase sweep** — Animate the phase parameter. This is a parameter sweep, not a simulation of photon flight or time evolution.

The phase plot always describes the final output. The statistics, complex amplitudes, and probability bars describe the selected observation point. CNOT fidelity is `|⟨ψideal|ψ⟩|²` for the selected input; it is not a general gate fidelity. Concurrence is `2|ad − bc|` for a pure two-qubit state.

## Equations and conventions

A single qubit uses `|0⟩L = |01⟩` and `|1⟩L = |10⟩`. The upper rail represents logical 0. Single-qubit Fock notation uses `(lower, upper)` order.

For two qubits, the arrangement matches p.294 of the textbook. Four-mode occupation numbers are listed from the top rail to the bottom rail.

```text
|00⟩L = |1001⟩     |01⟩L = |1010⟩
|10⟩L = |0101⟩     |11⟩L = |0110⟩

B(θ) = [[cos θ, −sin θ], [sin θ, cos θ]]
P(φ) = diag(1, exp(iφ))
H = B(π/4) diag(1, −1)
K(ξ) = diag(1, 1, 1, exp(iξ))
U_CNOT(ξ) = (I ⊗ H) K(ξ) (I ⊗ H)
```

The beam splitter uses the **explicit real matrix** in Eq. (7.35), avoiding ambiguity in exponential expressions and mode ordering. With the standard Pauli Y, this matrix is `exp(−iθY)`. The phase shifter acts on the logical-1 rail. The inverse beam splitter in the MZI uses angle `−θ`.

Loss, detector noise, photon distinguishability, and single-photon sources are not modeled. Computation stays within the logical subspace with one photon per dual-rail pair; this is not a simulator for arbitrary Fock states, Hong–Ou–Mandel interference, or KLM circuits. See §7.4.3 for the physical challenge of achieving strong Kerr nonlinearities between single photons.

Reference: Nielsen & Chuang, [*Quantum Computation and Quantum Information*](https://doi.org/10.1017/CBO9780511976667), §7.4, Eqs. (7.21), (7.35), (7.41)–(7.46), and Exercise 7.10. The relevant sections were checked against the textbook and errata PDFs in the workspace. The app does not serve those PDFs.

## Validation

Tests require Node.js 18 or later. Node.js is not needed to serve the simulator.

```sh
npm test
```

Tests cover the CNOT truth table, superposition outputs including relative phases, Bell-state generation, analytic Kerr responses, MZI interference, normalization at every stage, inverse beam-splitter transformations, and measurement sampling.

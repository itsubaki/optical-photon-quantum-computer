# Optical photon simulator for quantum computation

A demo built with HTML, CSS, and JavaScript that implements CNOT using beam splitters, phase shifters, and an ideal nonlinear Kerr interaction.
It uses the dual-rail encoding and optical gates described in Nielsen & Chuang, *Quantum Computation and Quantum Information*, §7.4.

```text
|00⟩_L = |1001⟩
|01⟩_L = |1010⟩
|10⟩_L = |0101⟩
|11⟩_L = |0110⟩
```

The four digits give the photon count in each rail, from top to bottom, following the arrangement on p.294 of the textbook.

$$
K(\xi) = \mathrm{diag}(1,1,1,e^{i\xi}), \qquad \xi = \chi L
$$

$$
U(\xi) = (I \otimes H)K(\xi)(I \otimes H)
$$

At ξ = π, the result matches the logical CNOT output. Input |+0⟩ produces the Bell state (|00⟩ + |11⟩)/√2.
The single-photon mode simulates a Mach–Zehnder interferometer, B(−θ)P(φ)B(θ), where P(φ) = diag(1, exp(iφ)) and θ = π/4 gives a 50:50 beam splitter.
Fidelity measures agreement with the ideal CNOT output for the selected input and observation point; it is not a general gate fidelity.
Loss, photon distinguishability, detector imperfections, and physical state-preparation or measurement hardware are not modeled.
The Kerr interaction is idealized; the difficulty of achieving a π phase shift between single photons is discussed in §7.4.3.

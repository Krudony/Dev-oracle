import { describe, it, expect } from 'vitest';
import { parseEquation } from '../../src/engine/parser';
import { solveEquation } from '../../src/engine/solver';
import { Rational } from '../../src/engine/rational';

describe('Automated Reverse PEMDAS Solver & Trace Generator', () => {
  it('generates full trace for canonical stacked fraction: 13(3m - 7)/3 = 78/9', () => {
    const eq = parseEquation('13(3m - 7)/3 = 78/9');
    const proof = solveEquation(eq);

    expect(proof.isSolvable).toBe(true);
    expect(proof.targetVariable).toBe('m');
    expect(proof.verifiedSolution.equals(new Rational(3, 1))).toBe(true);
    expect(proof.stepsCount).toBeGreaterThanOrEqual(4);
  });

  it('generates full trace for 3-tier master onion: 2[2 + 2{2 + (2x - 1)}] = 36', () => {
    const eq = parseEquation('2[2 + 2{2 + (2x - 1)}] = 36');
    const proof = solveEquation(eq);

    expect(proof.isSolvable).toBe(true);
    expect(proof.targetVariable).toBe('x');
    expect(proof.verifiedSolution.equals(new Rational(7, 2))).toBe(true);
  });

  it('generates full trace for clean integer onion: 2[2 + 2{2 + (2x - 1)}] = 32', () => {
    const eq = parseEquation('2[2 + 2{2 + (2x - 1)}] = 32');
    const proof = solveEquation(eq);

    expect(proof.isSolvable).toBe(true);
    expect(proof.targetVariable).toBe('x');
    expect(proof.verifiedSolution.equals(new Rational(3, 1))).toBe(true);
  });
});

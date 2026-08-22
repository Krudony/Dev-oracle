import { describe, it, expect } from 'vitest';
import { parseEquation } from '../../src/engine/parser';
import { solveEquation } from '../../src/engine/solver';

describe('Tier 2: Boundary & Corner Cases', () => {
  it('should handle division by 1 cleanly: x / 1 = 5', () => {
    const eq = parseEquation('x / 1 = 5');
    const proof = solveEquation(eq);
    expect(proof.isSolvable).toBe(true);
    expect(proof.verifiedSolution.n).toBe(5);
    expect(proof.verifiedSolution.d).toBe(1);
  });

  it('should handle negative constant terms: 5x - 20 = -5', () => {
    const eq = parseEquation('5x - 20 = -5');
    const proof = solveEquation(eq);
    expect(proof.isSolvable).toBe(true);
    expect(proof.verifiedSolution.n).toBe(3); // 5x = 15 -> x = 3
  });

  it('should handle zero solution: 4x + 8 = 8', () => {
    const eq = parseEquation('4x + 8 = 8');
    const proof = solveEquation(eq);
    expect(proof.isSolvable).toBe(true);
    expect(proof.verifiedSolution.n).toBe(0);
  });

  it('should handle non-integer rational solutions: 2x + 1 = 8 => x = 7/2', () => {
    const eq = parseEquation('2x + 1 = 8');
    const proof = solveEquation(eq);
    expect(proof.isSolvable).toBe(true);
    expect(proof.verifiedSolution.n).toBe(7);
    expect(proof.verifiedSolution.d).toBe(2);
  });

  it('should solve deep 5-level nested equation: 2[2+2{2+(2x-1)}] = 36', () => {
    const eq = parseEquation('2[2 + 2{2 + (2x - 1)}] = 36');
    const proof = solveEquation(eq);
    expect(proof.isSolvable).toBe(true);
    expect(proof.verifiedSolution.n).toBe(7);
    expect(proof.verifiedSolution.d).toBe(2);
  });

  it('should solve deep 5-level nested integer equation: 2[2+2{2+(2x-1)}] = 32 => x = 3', () => {
    const eq = parseEquation('2[2 + 2{2 + (2x - 1)}] = 32');
    const proof = solveEquation(eq);
    expect(proof.isSolvable).toBe(true);
    expect(proof.verifiedSolution.n).toBe(3);
    expect(proof.verifiedSolution.d).toBe(1);
  });
});

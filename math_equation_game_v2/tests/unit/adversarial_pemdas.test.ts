import { describe, it, expect } from 'vitest';
import { parseEquation } from '../../src/engine/parser';
import { solveEquation } from '../../src/engine/solver';

describe('Adversarial Stress Testing on Reverse PEMDAS Rules', () => {
  it('handles subtracting the variable term: 10 - 2x = 4', () => {
    const eq = parseEquation('10 - 2x = 4');
    const proof = solveEquation(eq);
    expect(proof).toBeDefined();
  });

  it('handles division by the variable term: 10 / (2x) = 5', () => {
    const eq = parseEquation('10 / (2x) = 5');
    const proof = solveEquation(eq);
    expect(proof).toBeDefined();
  });

  it('handles right side variable: 4 = 10 - 2x', () => {
    const eq = parseEquation('4 = 10 - 2x');
    const proof = solveEquation(eq);
    expect(proof).toBeDefined();
  });
});

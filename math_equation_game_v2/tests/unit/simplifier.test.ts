import { describe, it, expect } from 'vitest';
import { parseEquation } from '../../src/engine/parser';
import { findSimplifications, applySimplification } from '../../src/engine/simplifier';

describe('Simplification & Smart Tricks Engine', () => {
  it('detects reducible fraction 78/9 -> 26/3', () => {
    const eq = parseEquation('13(3m - 7)/3 = 78/9');
    const opps = findSimplifications(eq.rhs);

    expect(opps.length).toBeGreaterThan(0);
    expect(opps[0].type).toBe('FRACTION_REDUCE');
    expect(opps[0].originalText).toBe('78/9');
    expect(opps[0].simplifiedText).toBe('26/3');

    const res = applySimplification(eq, opps[0].nodeId);
    expect(res.success).toBe(true);
    expect(res.newEquation.rhs.type).toBe('fraction');
    expect(res.newEquation.rhs.numerator?.value).toBe(26);
    expect(res.newEquation.rhs.denominator?.value).toBe(3);
  });

  it('detects constant folding in 20 - 5 -> 15', () => {
    const eq = parseEquation('3x = 20 - 5');
    const opps = findSimplifications(eq.rhs);

    expect(opps.length).toBeGreaterThan(0);
    expect(opps[0].type).toBe('CONSTANT_FOLD');
    expect(opps[0].simplifiedText).toBe('15');

    const res = applySimplification(eq, opps[0].nodeId);
    expect(res.success).toBe(true);
    expect(res.newEquation.rhs.type).toBe('constant');
    expect(res.newEquation.rhs.value).toBe(15);
  });
});

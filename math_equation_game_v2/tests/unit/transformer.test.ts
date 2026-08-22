import { describe, it, expect } from 'vitest';
import { parseEquation } from '../../src/engine/parser';
import { applyMove } from '../../src/engine/transformer';
import { getPeelableNodes } from '../../src/engine/validator';
import { serializeToInfix } from '../../src/engine/serializer';

describe('Unpack & Transformation Engine', () => {
  it('applies addition move across equals sign', () => {
    const eq = parseEquation('3x + 5 = 20');
    const peelable = getPeelableNodes(eq.lhs, 'x');
    const res = applyMove(eq, peelable[0].nodeId, '-');

    expect(res.success).toBe(true);
    expect(serializeToInfix(res.newEquation.lhs)).toBe('3x');
    expect(serializeToInfix(res.newEquation.rhs)).toBe('20 - 5');
  });

  it('rejects incorrect inverse operation choice', () => {
    const eq = parseEquation('3x + 5 = 20');
    const peelable = getPeelableNodes(eq.lhs, 'x');
    const res = applyMove(eq, peelable[0].nodeId, '+'); // wrong! opposite of +5 is -5

    expect(res.success).toBe(false);
    expect(res.message).toContain('เลือกเครื่องหมายผิดจ้า');
  });

  it('unpacks denominator and creates multiplication on RHS', () => {
    const eq = parseEquation('(2x - 4) / 3 = 6');
    const peelable = getPeelableNodes(eq.lhs, 'x');
    const res = applyMove(eq, peelable[0].nodeId, '*');

    expect(res.success).toBe(true);
    expect(serializeToInfix(res.newEquation.lhs)).toBe('2x - 4');
    expect(serializeToInfix(res.newEquation.rhs)).toBe('6 * 3');
  });

  it('unpacks outer multiplier and creates vertical fraction on RHS', () => {
    const eq = parseEquation('2[2x - 1] = 16');
    const peelable = getPeelableNodes(eq.lhs, 'x');
    const res = applyMove(eq, peelable[0].nodeId, '/');

    expect(res.success).toBe(true);
    expect(serializeToInfix(res.newEquation.lhs)).toBe('2x - 1');
    expect(res.newEquation.rhs.type).toBe('fraction');
  });
});

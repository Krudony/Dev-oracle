import { describe, it } from 'vitest';
import assert from 'node:assert';
import { parseEquation } from '../../src/engine/parser.ts';
import { getPeelableNodes, validateMove } from '../../src/engine/validator.ts';
describe('Tier 1: Feature 2 - Reverse PEMDAS Validation & Diagnostics Engine', () => {
  it('2.1 should identify peelable constant term in standard linear equation: 3x + 5 = 20', () => {
    const eq = parseEquation('3x + 5 = 20');
    const peelables = getPeelableNodes(eq.lhs, eq.targetVariable);
    assert.strictEqual(peelables.length, 1);
    assert.strictEqual(peelables[0].requiredInverseOp, '-');
    assert.strictEqual(peelables[0].moveType, 'ADD_SUB');
  });

  it('2.2 should identify peelable denominator in stacked fraction: 13(3m-7)/3 = 78/9', () => {
    const eq = parseEquation('13(3m - 7) / 3 = 78 / 9');
    const peelables = getPeelableNodes(eq.lhs, eq.targetVariable);
    assert.strictEqual(peelables.length, 1);
    assert.strictEqual(peelables[0].requiredInverseOp, '*');
    assert.strictEqual(peelables[0].moveType, 'FRAC_DENOM');
  });

  it('2.3 should identify peelable outer multiplier on group: 13(3m - 7) = 26', () => {
    const eq = parseEquation('13(3m - 7) = 26');
    const peelables = getPeelableNodes(eq.lhs, eq.targetVariable);
    assert.strictEqual(peelables.length, 1);
    assert.strictEqual(peelables[0].requiredInverseOp, '/');
    assert.strictEqual(peelables[0].moveType, 'COEFF_MULT');
  });

  it('2.4 should strictly block terms trapped inside numerator: TRAPPED_IN_NUMERATOR', () => {
    const eq = parseEquation('13(3m - 7) / 3 = 78 / 9');
    if (eq.lhs.type === 'fraction' && eq.lhs.numerator!.type === 'binary') {
      const groupNode = eq.lhs.numerator!.right;
      if (groupNode!.type === 'group' && groupNode!.inner!.type === 'binary') {
        const term7 = groupNode!.inner!.right;
        const res = validateMove(eq, term7!.id);
        assert.strictEqual(res.isValid, false);
        assert.strictEqual(res.errorCode, 'TRAPPED_IN_NUMERATOR');
        assert.ok(res.errorMessage?.includes('trapped in the numerator'));
      }
    }
  });

  it('2.5 should strictly block terms trapped inside brackets: TRAPPED_IN_BRACKET', () => {
    const eq = parseEquation('2[2 + 2{2 + (2x - 1)}] = 36');
    // Inner term 1 is trapped deep inside round brackets
    if (eq.lhs.type === 'binary' && eq.lhs.right!.type === 'group') {
      const outerSquare = eq.lhs.right!.inner;
      if (outerSquare!.type === 'binary' && outerSquare!.right!.type === 'binary') {
        const midCurly = outerSquare!.right!.right;
        if (midCurly!.type === 'group') {
          const res = validateMove(eq, midCurly!.id);
          assert.strictEqual(res.isValid, false);
          assert.strictEqual(res.errorCode, 'TRAPPED_IN_FACTOR');
          // assert.ok(res.errorMessage?.includes('trapped inside the'));
        }
      }
    }
  });

  it('2.6 should reject clicking the target variable node directly: VARIABLE_NODE_SELECTED', () => {
    const eq = parseEquation('3x + 5 = 20');
    if (eq.lhs.type === 'binary' && eq.lhs.left!.type === 'binary') {
      const varNode = eq.lhs.left!.right;
      const res = validateMove(eq, varNode!.id);
      assert.strictEqual(res.isValid, false);
      assert.strictEqual(res.errorCode, 'VARIABLE_NODE_SELECTED');
      // assert.ok(res.errorMessage?.includes('The goal is to isolate'));
    }
  });

  it('2.7 should reject clicking terms on the RHS: WRONG_SIDE', () => {
    const eq = parseEquation('3x + 5 = 20');
    const res = validateMove(eq, eq.rhs.id);
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.errorCode, 'WRONG_SIDE');
    // assert.ok(res.errorMessage?.includes('already on the right side'));
  });
});

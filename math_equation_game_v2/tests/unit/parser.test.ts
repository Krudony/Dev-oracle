import { describe, it } from 'vitest';
import assert from 'node:assert';
import { parseEquation, parseExpression } from '../../src/engine/parser.ts';
import { serializeEquationLaTeX } from '../../src/engine/serializer.ts';


describe('Tier 1: Feature 1 - AST Parsing & Serialization Engine', () => {
  it('1.1 should parse simple linear equation with addition: 3x + 5 = 20', () => {
    const eq = parseEquation('3x + 5 = 20');
    assert.strictEqual(eq.targetVariable, 'x');
    assert.strictEqual(eq.lhs.type, 'binary');
    if (eq.lhs.type === 'binary') {
      assert.strictEqual(eq.lhs.op, '+');
      assert.strictEqual(eq.lhs.left!.type, 'binary'); // 3 * x
      assert.strictEqual(eq.lhs.right!.type, 'constant');
    }
    assert.strictEqual(eq.rhs.type, 'constant');
  });

  it('1.2 should parse canonical equation 1 with stacked fraction & implicit multiplier: 13(3m-7)/3 = 78/9', () => {
    const eq = parseEquation('13(3m - 7) / 3 = 78 / 9');
    assert.strictEqual(eq.targetVariable, 'm');
    assert.strictEqual(eq.lhs.type, 'fraction');
    assert.strictEqual(eq.rhs.type, 'fraction');

    if (eq.lhs.type === 'fraction') {
      assert.strictEqual(eq.lhs.numerator!.type, 'binary'); // 13 * (3m - 7)
      assert.strictEqual(eq.lhs.denominator!.type, 'constant'); // 3
      if (eq.lhs.numerator!.type === 'binary') {
        assert.strictEqual(eq.lhs.numerator!.op, '*');
        assert.strictEqual(eq.lhs.numerator!.right!.type, 'group'); // (3m - 7)
      }
    }
  });

  it('1.3 should parse canonical equation 2 with 3-tier nested grouping symbols [] {} (): 2[2+2{2+(2x-1)}] = 36', () => {
    const eq = parseEquation('2[2 + 2{2 + (2x - 1)}] = 36');
    assert.strictEqual(eq.targetVariable, 'x');
    assert.strictEqual(eq.lhs.type, 'binary'); // 2 * [...]

    if (eq.lhs.type === 'binary') {
      assert.strictEqual(eq.lhs.op, '*');
      const squareGroup = eq.lhs.right;
      assert.strictEqual(squareGroup!.type, 'group');
      if (squareGroup!.type === 'group') {
        assert.strictEqual(squareGroup!.bracketType, 'square');
        const innerSquare = squareGroup!.inner;
        assert.strictEqual(innerSquare!.type, 'binary'); // 2 + 2{...}
      }
    }
  });

  it('1.4 should parse negative coefficients, unary negation, and decimal numbers', () => {
    const eq = parseEquation('-5.5y - 12.25 = -40');
    assert.strictEqual(eq.targetVariable, 'y');
    assert.strictEqual(eq.lhs.type, 'binary');
    if (eq.lhs.type === 'binary') {
      assert.strictEqual(eq.lhs.op, '-');
    }
  });

  it('1.5 should serialize AST to LaTeX containing \\frac and \\left[ \\right] properly', () => {
    const eq = parseEquation('2[2 + 2{2 + (2x - 1)}] = 36');
    const latex = serializeEquationLaTeX(eq);
    assert.ok(latex.includes('\\left['), 'Must include square bracket LaTeX');
    assert.ok(latex.includes('\\left\\{'), 'Must include curly brace LaTeX');
    assert.ok(latex.includes('\\left('), 'Must include round parenthesis LaTeX');
    assert.ok(latex.includes('= 36'), 'Must include RHS LaTeX');
  });

  it('1.6 should reject invalid syntax with descriptive error messages', () => {
    assert.throws(() => parseEquation('3x + 5 20'), /must contain exactly one equals sign/);
    assert.throws(() => parseExpression('2[2 + (3x - 1)'), /Expected closing bracket/);
    assert.throws(() => parseExpression(''), /Unexpected token/);
  });
});

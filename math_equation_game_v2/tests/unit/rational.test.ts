import { describe, it, expect } from 'vitest';
import { Rational, gcd, simplifyFraction } from '../../src/engine/rational';

describe('Exact Rational Arithmetic Engine', () => {
  it('correctly calculates greatest common divisor (GCD)', () => {
    expect(gcd(78, 9)).toBe(3);
    expect(gcd(54, 24)).toBe(6);
    expect(gcd(17, 19)).toBe(1);
    expect(gcd(0, 5)).toBe(5);
    expect(gcd(12, 0)).toBe(12);
  });

  it('correctly simplifies fractions via simplifyFraction helper', () => {
    expect(simplifyFraction(78, 9)).toEqual({ num: 26, den: 3, changed: true });
    expect(simplifyFraction(26, 3)).toEqual({ num: 26, den: 3, changed: false });
    expect(simplifyFraction(36, 2)).toEqual({ num: 18, den: 1, changed: true });
    expect(simplifyFraction(-10, 4)).toEqual({ num: -5, den: 2, changed: true });
  });

  it('performs exact addition and subtraction without floating point errors', () => {
    const r1 = new Rational(1, 3);
    const r2 = new Rational(1, 6);
    const sum = r1.add(r2);
    expect(sum.equals(new Rational(1, 2))).toBe(true);

    const diff = r1.sub(r2);
    expect(diff.equals(new Rational(1, 6))).toBe(true);
  });

  it('performs exact multiplication and division', () => {
    const r1 = new Rational(26, 3);
    const r2 = new Rational(3, 1);
    const prod = r1.mul(r2);
    expect(prod.equals(new Rational(26, 1))).toBe(true);
    expect(prod.toInt()).toBe(26);

    const divRes = prod.div(13);
    expect(divRes.equals(new Rational(2, 1))).toBe(true);
  });

  it('throws on division by zero', () => {
    const r = new Rational(5, 1);
    expect(() => r.div(0)).toThrow('Division by zero');
    expect(() => new Rational(1, 0)).toThrow('Denominator cannot be zero');
  });

  it('converts to clean strings and LaTeX', () => {
    expect(new Rational(7, 2).toString()).toBe('7/2');
    expect(new Rational(7, 2).toLatex()).toBe('\\frac{7}{2}');
    expect(new Rational(5, 1).toString()).toBe('5');
    expect(new Rational(5, 1).toLatex()).toBe('5');
  });
});

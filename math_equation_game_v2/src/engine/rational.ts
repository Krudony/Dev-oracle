/**
 * Exact Rational Arithmetic Engine
 * Eliminates floating-point inaccuracies and handles fractions exactly.
 */

export interface FractionValue {
  n: number;
  d: number; // Invariant: d > 0
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x === 0 ? 1 : x;
}

export function simplifyFraction(num: number, den: number): { num: number; den: number; changed: boolean } {
  if (den === 0) return { num, den, changed: false };
  let n = Math.round(num);
  let d = Math.round(den);
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  if (g > 1) {
    return { num: n / g, den: d / g, changed: true };
  }
  return { num: n, den: d, changed: false };
}

export class Rational {
  readonly n: number;
  readonly d: number;

  constructor(n: number, d: number = 1) {
    if (d === 0) throw new Error("Denominator cannot be zero.");
    let num = Math.round(n);
    let den = Math.round(d);
    if (den < 0) {
      num = -num;
      den = -den;
    }
    if (num === 0) {
      this.n = 0;
      this.d = 1;
    } else {
      const g = gcd(Math.abs(num), den);
      this.n = num / g;
      this.d = den / g;
    }
  }

  static gcd(a: number, b: number): number {
    return gcd(a, b);
  }

  static from(val: number | FractionValue | Rational): Rational {
    if (val instanceof Rational) return val;
    if (typeof val === 'number') return new Rational(val, 1);
    return new Rational(val.n, val.d);
  }

  add(other: Rational | number | FractionValue): Rational {
    const o = Rational.from(other);
    return new Rational(this.n * o.d + o.n * this.d, this.d * o.d);
  }

  sub(other: Rational | number | FractionValue): Rational {
    const o = Rational.from(other);
    return new Rational(this.n * o.d - o.n * this.d, this.d * o.d);
  }

  mul(other: Rational | number | FractionValue): Rational {
    const o = Rational.from(other);
    return new Rational(this.n * o.n, this.d * o.d);
  }

  div(other: Rational | number | FractionValue): Rational {
    const o = Rational.from(other);
    if (o.n === 0) throw new Error("Division by zero in Rational.");
    return new Rational(this.n * o.d, this.d * o.n);
  }

  isInteger(): boolean {
    return this.d === 1;
  }

  toInt(): number {
    if (!this.isInteger()) {
      return this.n / this.d;
    }
    return this.n;
  }

  toNumber(): number {
    return this.n / this.d;
  }

  equals(other: Rational | number | FractionValue): boolean {
    const o = Rational.from(other);
    return this.n === o.n && this.d === o.d;
  }

  toString(): string {
    return this.d === 1 ? `${this.n}` : `${this.n}/${this.d}`;
  }

  toLatex(): string {
    return this.d === 1 ? `${this.n}` : `\\frac{${this.n}}{${this.d}}`;
  }
}

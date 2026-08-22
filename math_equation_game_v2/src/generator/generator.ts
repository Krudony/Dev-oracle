import { Rational } from '../engine/rational.ts';
import type { ASTNode, BracketType, EquationState } from '../engine/types.ts';
import { DIFFICULTY_PROFILES } from './profiles.ts';


export interface GeneratorOptions {
  level: number;
  targetVariable?: string;
  allowFractions?: boolean;
}

export class EquationGenerator {
  private idCounter = 0;

  private nextId(prefix: string = 'node'): string {
    this.idCounter++;
    return `${prefix}_${Date.now()}_${this.idCounter}`;
  }

  /**
   * Main Generator Entrypoint
   */
  public generate(options: GeneratorOptions): EquationState {
    const level = Math.max(1, Math.min(5, options.level));
    const profile = DIFFICULTY_PROFILES[level];
    const variable =
      options.targetVariable ||
      profile.variablePool[Math.floor(Math.random() * profile.variablePool.length)];

    switch (level) {
      case 1:
        return this.generateLevel1(variable);
      case 2:
        return this.generateLevel2(variable);
      case 3:
        return this.generateLevel3(variable);
      case 4:
        return this.generateLevel4(variable);
      case 5:
        return this.generateLevel5(variable);
      default:
        return this.generateLevel1(variable);
    }
  }

  private randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // --- AST Node Factory Helpers ---

  private makeVar(name: string): ASTNode {
    return { id: this.nextId('var'), type: 'variable', name };
  }

  private makeConst(val: number | Rational): ASTNode {
    const r = Rational.from(val);
    return {
      id: this.nextId('const'),
      type: 'constant',
      value: r.n,
      fractionValue: { n: r.n, d: r.d }
    };
  }

  private makeBinary(
    op: '+' | '-' | '*' | '/',
    left: ASTNode,
    right: ASTNode,
    implicit: boolean = false
  ): ASTNode {
    return { id: this.nextId('bin'), type: 'binary', op, left, right, implicit };
  }

  private makeFraction(num: ASTNode, den: ASTNode): ASTNode {
    return { id: this.nextId('frac'), type: 'fraction', numerator: num, denominator: den };
  }

  private makeGroup(inner: ASTNode, bracketType: BracketType): ASTNode {
    return { id: this.nextId('grp'), type: 'group', inner, bracketType };
  }

  // --- LEVEL 1: Single Outer Step (e.g. 3x + 5 = 20) ---
  private generateLevel1(variableName: string): EquationState {
    const solVal = this.randInt(2, 10);
    const solution = new Rational(solVal, 1);
    const varNode = this.makeVar(variableName);

    const coeff = this.randInt(2, 6);
    const constTerm = this.randInt(2, 12);
    const isAdd = Math.random() > 0.4;

    const multNode = this.makeBinary('*', this.makeConst(coeff), varNode, true);
    let lhs: ASTNode;
    let rhsVal: Rational;

    if (isAdd) {
      lhs = this.makeBinary('+', multNode, this.makeConst(constTerm));
      rhsVal = solution.mul(coeff).add(constTerm);
    } else {
      lhs = this.makeBinary('-', multNode, this.makeConst(constTerm));
      rhsVal = solution.mul(coeff).sub(constTerm);
    }

    return {
      id: this.nextId('eq'),
      lhs,
      rhs: this.makeConst(rhsVal),
      targetVariable: variableName,
      solution: { n: solution.n, d: solution.d },
      difficultyLevel: 1,
      stepCount: 0,
      isSolved: false,
      initialEquationStr: `${coeff}${variableName} ${isAdd ? '+' : '-'} ${constTerm} = ${rhsVal.n}`
    };
  }

  // --- LEVEL 2: Single Fraction (e.g. (2x - 4)/3 = 6) ---
  private generateLevel2(variableName: string): EquationState {
    const solVal = this.randInt(3, 12);
    const solution = new Rational(solVal, 1);
    const varNode = this.makeVar(variableName);

    const coeff = this.randInt(2, 5);
    const constTerm = this.randInt(2, 8);
    const isAdd = Math.random() > 0.5;
    const den = this.randInt(2, 5);

    const multNode = this.makeBinary('*', this.makeConst(coeff), varNode, true);
    const inner = isAdd
      ? this.makeBinary('+', multNode, this.makeConst(constTerm))
      : this.makeBinary('-', multNode, this.makeConst(constTerm));

    const numVal = isAdd ? solution.mul(coeff).add(constTerm) : solution.mul(coeff).sub(constTerm);
    const rhsVal = numVal.div(den);

    const lhs = this.makeFraction(inner, this.makeConst(den));

    return {
      id: this.nextId('eq'),
      lhs,
      rhs: this.makeConst(rhsVal),
      targetVariable: variableName,
      solution: { n: solution.n, d: solution.d },
      difficultyLevel: 2,
      stepCount: 0,
      isSolved: false,
      initialEquationStr: `(${coeff}${variableName} ${isAdd ? '+' : '-'} ${constTerm}) / ${den} = ${rhsVal.toString()}`
    };
  }

  // --- LEVEL 3: Nested Parentheses & Reducible Fractions (e.g. 13(3m - 7)/3 = 78/9) ---
  private generateLevel3(variableName: string): EquationState {
    const solVal = this.randInt(2, 6);
    const solution = new Rational(solVal, 1);
    const varNode = this.makeVar(variableName);

    const innerCoeff = this.randInt(2, 4);
    const innerConst = this.randInt(2, 7);
    const isAdd = Math.random() > 0.6;
    const outerCoeff = this.randInt(2, 13);
    const den = this.randInt(2, 4);

    const innerMult = this.makeBinary('*', this.makeConst(innerCoeff), varNode, true);
    const innerExpr = isAdd
      ? this.makeBinary('+', innerMult, this.makeConst(innerConst))
      : this.makeBinary('-', innerMult, this.makeConst(innerConst));

    const groupNode = this.makeGroup(innerExpr, 'round');
    const multNode = this.makeBinary('*', this.makeConst(outerCoeff), groupNode, true);
    const lhs = this.makeFraction(multNode, this.makeConst(den));

    const innerVal = isAdd
      ? solution.mul(innerCoeff).add(innerConst)
      : solution.mul(innerCoeff).sub(innerConst);
    const exactRHS = innerVal.mul(outerCoeff).div(den);

    // Create unsimplified fraction on RHS (e.g. 26/3 -> 78/9 with k=3)
    const k = this.randInt(2, 3);
    const rhsNode = this.makeConst(exactRHS);
    rhsNode.isReducible = true;
    rhsNode.unsimplifiedFraction = { n: exactRHS.n * k, d: exactRHS.d * k };

    return {
      id: this.nextId('eq'),
      lhs,
      rhs: rhsNode,
      targetVariable: variableName,
      solution: { n: solution.n, d: solution.d },
      difficultyLevel: 3,
      stepCount: 0,
      isSolved: false,
      initialEquationStr: `${outerCoeff}(${innerCoeff}${variableName} ${isAdd ? '+' : '-'} ${innerConst}) / ${den} = ${exactRHS.n * k}/${exactRHS.d * k}`
    };
  }

  // --- LEVEL 4: Double Grouping {} and () (e.g. 3{4 + 2(3x - 5)} = 48) ---
  private generateLevel4(variableName: string): EquationState {
    const solVal = this.randInt(2, 5);
    const solution = new Rational(solVal, 1);
    const varNode = this.makeVar(variableName);

    const innermostCoeff = this.randInt(2, 4);
    const innermostConst = this.randInt(1, 6);
    const midCoeff = this.randInt(2, 3);
    const midConst = this.randInt(2, 6);
    const outerCoeff = this.randInt(2, 4);

    const innerMult = this.makeBinary('*', this.makeConst(innermostCoeff), varNode, true);
    const innerExpr = this.makeBinary('-', innerMult, this.makeConst(innermostConst));
    const roundGroup = this.makeGroup(innerExpr, 'round');

    const midMult = this.makeBinary('*', this.makeConst(midCoeff), roundGroup, true);
    const midExpr = this.makeBinary('+', this.makeConst(midConst), midMult);
    const curlyGroup = this.makeGroup(midExpr, 'curly');

    const lhs = this.makeBinary('*', this.makeConst(outerCoeff), curlyGroup, true);

    const innerVal = solution.mul(innermostCoeff).sub(innermostConst);
    const midVal = innerVal.mul(midCoeff).add(midConst);
    const rhsVal = midVal.mul(outerCoeff);

    return {
      id: this.nextId('eq'),
      lhs,
      rhs: this.makeConst(rhsVal),
      targetVariable: variableName,
      solution: { n: solution.n, d: solution.d },
      difficultyLevel: 4,
      stepCount: 0,
      isSolved: false,
      initialEquationStr: `${outerCoeff}{${midConst} + ${midCoeff}(${innermostCoeff}${variableName} - ${innermostConst})} = ${rhsVal.n}`
    };
  }

  // --- LEVEL 5: Master Onion [] {} () (e.g. 2[2 + 2{2 + (2x - 1)}] = 32) ---
  private generateLevel5(variableName: string): EquationState {
    const solVal = this.randInt(2, 4);
    const solution = new Rational(solVal, 1);
    const varNode = this.makeVar(variableName);

    const c1 = 2; // innermost mult
    const k1 = 1; // innermost sub
    const c2 = 2; // mid add
    const m2 = 2; // mid mult
    const c3 = 2; // outer add
    const m3 = 2; // outer mult

    const innerBin = this.makeBinary('-', this.makeBinary('*', this.makeConst(c1), varNode, true), this.makeConst(k1));
    const roundGroup = this.makeGroup(innerBin, 'round');

    const midBin = this.makeBinary('+', this.makeConst(c2), roundGroup);
    const curlyGroup = this.makeGroup(midBin, 'curly');

    const outerMult = this.makeBinary('*', this.makeConst(m2), curlyGroup, true);
    const outerAdd = this.makeBinary('+', this.makeConst(c3), outerMult);
    const squareGroup = this.makeGroup(outerAdd, 'square');

    const lhs = this.makeBinary('*', this.makeConst(m3), squareGroup, true);

    const v1 = solution.mul(c1).sub(k1);
    const v2 = v1.add(c2);
    const v3 = v2.mul(m2).add(c3);
    const rhsVal = v3.mul(m3);

    return {
      id: this.nextId('eq'),
      lhs,
      rhs: this.makeConst(rhsVal),
      targetVariable: variableName,
      solution: { n: solution.n, d: solution.d },
      difficultyLevel: 5,
      stepCount: 0,
      isSolved: false,
      initialEquationStr: `${m3}[${c3} + ${m2}{${c2} + (${c1}${variableName} - ${k1})}] = ${rhsVal.n}`
    };
  }
}

export const equationGenerator = new EquationGenerator();

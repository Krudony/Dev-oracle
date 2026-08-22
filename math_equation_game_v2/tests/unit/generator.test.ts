import { describe, it, expect } from 'vitest';
import { equationGenerator } from '../../src/generator/generator';
import { LEVEL_PRESETS } from '../../src/generator/presets';
import { solveEquation } from '../../src/engine/solver';
import { parseEquation } from '../../src/engine/parser';
import { ASTNode } from '../../src/engine/types';

function countNodeTypes(node: ASTNode, type: string): number {
  let count = node.type === type ? 1 : 0;
  if (node.type === 'binary' && node.left && node.right) {
    count += countNodeTypes(node.left, type) + countNodeTypes(node.right, type);
  } else if (node.type === 'fraction' && node.numerator && node.denominator) {
    count += countNodeTypes(node.numerator, type) + countNodeTypes(node.denominator, type);
  } else if (node.type === 'group' && node.inner) {
    count += countNodeTypes(node.inner, type);
  } else if (node.type === 'unary' && node.inner) {
    count += countNodeTypes(node.inner, type);
  }
  return count;
}

describe('Tier 1 & Tier 4: Equation Generator & Presets Verification', () => {
  it('generates 100% solvable equations across all 5 difficulty levels', () => {
    for (let lvl = 1; lvl <= 5; lvl++) {
      for (let i = 0; i < 10; i++) {
        const eq = equationGenerator.generate({ level: lvl });
        expect(eq.targetVariable).toBeTruthy();

        const proof = solveEquation(eq);
        expect(proof.isSolvable).toBe(true);
        expect(proof.stepsCount).toBeGreaterThan(0);
        expect(proof.verifiedSolution.equals(eq.solution)).toBe(true);
      }
    }
  });

  it('generates structurally correct ASTs for Level 1', () => {
    const eq = equationGenerator.generate({ level: 1 });
    // Level 1 should be a simple ax + b = c format
    expect(countNodeTypes(eq.lhs, 'group')).toBe(0);
    expect(countNodeTypes(eq.lhs, 'fraction')).toBe(0);
    expect(countNodeTypes(eq.lhs, 'binary')).toBeGreaterThan(0);
  });

  it('generates structurally correct ASTs for Level 2', () => {
    const eq = equationGenerator.generate({ level: 2 });
    // Level 2 should have fractions but no groups
    expect(countNodeTypes(eq.lhs, 'fraction')).toBeGreaterThan(0);
    expect(countNodeTypes(eq.lhs, 'group')).toBe(0);
  });

  it('generates structurally correct ASTs for Level 3', () => {
    const eq = equationGenerator.generate({ level: 3 });
    // Level 3 should have groups and fractions
    expect(countNodeTypes(eq.lhs, 'group')).toBeGreaterThan(0);
    expect(countNodeTypes(eq.lhs, 'fraction')).toBeGreaterThan(0);
  });

  it('generates structurally correct ASTs for Level 4', () => {
    const eq = equationGenerator.generate({ level: 4 });
    // Level 4 should have multiple nested groups
    expect(countNodeTypes(eq.lhs, 'group')).toBeGreaterThan(1);
  });

  it('generates structurally correct ASTs for Level 5', () => {
    const eq = equationGenerator.generate({ level: 5 });
    // Level 5 should have multiple nested groups including square brackets (implied by max depth)
    expect(countNodeTypes(eq.lhs, 'group')).toBeGreaterThan(2);
  });

  it('verifies that all 25 curated level presets are 100% solvable', () => {
    for (const preset of LEVEL_PRESETS) {
      const eq = parseEquation(preset.equationStr);
      const proof = solveEquation(eq);

      expect(proof.isSolvable).toBe(true);
      expect(proof.verifiedSolution.equals(preset.solution)).toBe(true);
    }
  });
});

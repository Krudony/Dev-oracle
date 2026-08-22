import { describe, it, expect } from 'vitest';
import { parseEquation } from '../../src/engine/parser';
import { getPeelableNodes } from '../../src/engine/validator';
import { applyMove } from '../../src/engine/transformer';
import { applySimplification, findSimplifications } from '../../src/engine/simplifier';
import { evaluateConstantTree } from '../../src/engine/ast';

describe('E2E Full Step-by-Step Simulation', () => {
  it('simulates complete step-by-step user unpacking of 13(3m - 7)/3 = 78/9', () => {
    let eq = parseEquation('13(3m - 7)/3 = 78/9');
    expect(eq.isSolved).toBe(false);

    // Step 0: User simplifies 78/9 -> 26/3
    const rhsOpps = findSimplifications(eq.rhs);
    expect(rhsOpps.length).toBe(1);
    const simpRes = applySimplification(eq, rhsOpps[0].nodeId);
    expect(simpRes.success).toBe(true);
    eq = simpRes.newEquation;

    // Step 1: User peels denominator 3 with '*'
    let peelable = getPeelableNodes(eq.lhs, 'm');
    expect(peelable.length).toBe(1);
    expect(peelable[0].requiredInverseOp).toBe('*');
    let moveRes = applyMove(eq, peelable[0].nodeId, '*');
    expect(moveRes.success).toBe(true);
    eq = moveRes.newEquation;

    // Step 2: User simplifies RHS (26/3) * 3 -> 26
    const foldOpps1 = findSimplifications(eq.rhs);
    expect(foldOpps1.length).toBeGreaterThan(0);
    const simpRes2 = applySimplification(eq, foldOpps1[0].nodeId);
    expect(simpRes2.success).toBe(true);
    eq = simpRes2.newEquation;

    // Step 3: User peels outer multiplier 13 with '/'
    peelable = getPeelableNodes(eq.lhs, 'm');
    expect(peelable.length).toBe(1);
    expect(peelable[0].requiredInverseOp).toBe('/');
    moveRes = applyMove(eq, peelable[0].nodeId, '/');
    expect(moveRes.success).toBe(true);
    eq = moveRes.newEquation;

    // Step 4: User simplifies RHS 26 / 13 -> 2
    const foldOpps2 = findSimplifications(eq.rhs);
    expect(foldOpps2.length).toBeGreaterThan(0);
    const simpRes3 = applySimplification(eq, foldOpps2[0].nodeId);
    expect(simpRes3.success).toBe(true);
    eq = simpRes3.newEquation;

    // Step 5: User peels constant 7 with '+'
    peelable = getPeelableNodes(eq.lhs, 'm');
    expect(peelable.length).toBe(1);
    expect(peelable[0].requiredInverseOp).toBe('+');
    moveRes = applyMove(eq, peelable[0].nodeId, '+');
    expect(moveRes.success).toBe(true);
    eq = moveRes.newEquation;

    // Step 6: User simplifies RHS 2 + 7 -> 9
    const foldOpps3 = findSimplifications(eq.rhs);
    expect(foldOpps3.length).toBeGreaterThan(0);
    const simpRes4 = applySimplification(eq, foldOpps3[0].nodeId);
    expect(simpRes4.success).toBe(true);
    eq = simpRes4.newEquation;

    // Step 7: User peels coefficient 3 with '/'
    peelable = getPeelableNodes(eq.lhs, 'm');
    expect(peelable.length).toBe(1);
    expect(peelable[0].requiredInverseOp).toBe('/');
    moveRes = applyMove(eq, peelable[0].nodeId, '/');
    expect(moveRes.success).toBe(true);
    eq = moveRes.newEquation;

    // Step 8: User simplifies 9 / 3 -> 3
    const foldOpps4 = findSimplifications(eq.rhs);
    expect(foldOpps4.length).toBeGreaterThan(0);
    const simpRes5 = applySimplification(eq, foldOpps4[0].nodeId);
    expect(simpRes5.success).toBe(true);
    eq = simpRes5.newEquation;

    // Isolate Verified!
    expect(eq.isSolved).toBe(true);
    expect(eq.lhs.type).toBe('variable');
    expect(eq.lhs.name).toBe('m');
    const finalVal = evaluateConstantTree(eq.rhs);
    expect(finalVal?.toInt()).toBe(3);
  });
});

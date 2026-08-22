import { describe, it, expect } from 'vitest';
import { parseEquation } from '../../src/engine/parser';
import { getPeelableNodes } from '../../src/engine/validator';
import { applyMove } from '../../src/engine/transformer';
import { findSimplifications, applySimplification } from '../../src/engine/simplifier';
import { serializeToInfix } from '../../src/engine/serializer';

describe('Tier 4: End-to-End Unpack Simulation & Game Flow', () => {
  it('should simulate full step-by-step peeling of canonical equation 1: 13(3m-7)/3 = 78/9 ➔ m = 3', () => {
    let eq = parseEquation('13(3m - 7) / 3 = 78 / 9');
    expect(eq.isSolved).toBe(false);

    // Step 0: User simplifies RHS 78/9 ➔ 26/3
    const rhsOpps = findSimplifications(eq.rhs);
    expect(rhsOpps.length).toBeGreaterThan(0);
    const simpRes = applySimplification(eq, rhsOpps[0].nodeId);
    expect(simpRes.success).toBe(true);
    eq = simpRes.newEquation;
    expect(serializeToInfix(eq.rhs)).toBe('(26) / 3');

    // Step 1: User peels denominator 3 (/ 3 becomes * 3)
    let peel = getPeelableNodes(eq.lhs, eq.targetVariable)[0];
    expect(peel.requiredInverseOp).toBe('*');
    let moveRes = applyMove(eq, peel.nodeId, '*');
    expect(moveRes.success).toBe(true);
    eq = moveRes.newEquation;
    expect(serializeToInfix(eq.lhs)).toBe('13(3m - 7)');

    // Step 2: User simplifies RHS ((26)/3) * 3 ➔ 26
    const rhsFold = findSimplifications(eq.rhs);
    expect(rhsFold.length).toBeGreaterThan(0);
    const foldRes = applySimplification(eq, rhsFold[0].nodeId);
    expect(foldRes.success).toBe(true);
    eq = foldRes.newEquation;
    expect(serializeToInfix(eq.rhs)).toBe('26');

    // Step 3: User peels outer multiplier 13 (* 13 becomes / 13)
    peel = getPeelableNodes(eq.lhs, eq.targetVariable)[0];
    expect(peel.requiredInverseOp).toBe('/');
    moveRes = applyMove(eq, peel.nodeId, '/');
    expect(moveRes.success).toBe(true);
    eq = moveRes.newEquation;
    expect(serializeToInfix(eq.lhs)).toBe('3m - 7');

    // Step 4: User simplifies RHS 26 / 13 ➔ 2
    const rhsFold2 = findSimplifications(eq.rhs);
    expect(rhsFold2.length).toBeGreaterThan(0);
    const foldRes2 = applySimplification(eq, rhsFold2[0].nodeId);
    expect(foldRes2.success).toBe(true);
    eq = foldRes2.newEquation;
    expect(serializeToInfix(eq.rhs)).toBe('2');

    // Step 5: User peels subtraction - 7 (- 7 becomes + 7)
    peel = getPeelableNodes(eq.lhs, eq.targetVariable)[0];
    expect(peel.requiredInverseOp).toBe('+');
    moveRes = applyMove(eq, peel.nodeId, '+');
    expect(moveRes.success).toBe(true);
    eq = moveRes.newEquation;
    expect(serializeToInfix(eq.lhs)).toBe('3m');

    // Step 6: User simplifies RHS 2 + 7 ➔ 9
    const rhsFold3 = findSimplifications(eq.rhs);
    expect(rhsFold3.length).toBeGreaterThan(0);
    const foldRes3 = applySimplification(eq, rhsFold3[0].nodeId);
    expect(foldRes3.success).toBe(true);
    eq = foldRes3.newEquation;
    expect(serializeToInfix(eq.rhs)).toBe('9');

    // Step 7: User peels coefficient 3 (* 3 becomes / 3)
    peel = getPeelableNodes(eq.lhs, eq.targetVariable)[0];
    expect(peel.requiredInverseOp).toBe('/');
    moveRes = applyMove(eq, peel.nodeId, '/');
    expect(moveRes.success).toBe(true);
    eq = moveRes.newEquation;
    expect(serializeToInfix(eq.lhs)).toBe('m');
    expect(eq.isSolved).toBe(true);

    // Final simplification of 9 / 3 ➔ 3
    const finalFold = findSimplifications(eq.rhs);
    expect(finalFold.length).toBeGreaterThan(0);
    const finalRes = applySimplification(eq, finalFold[0].nodeId);
    expect(finalRes.success).toBe(true);
    eq = finalRes.newEquation;
    expect(serializeToInfix(eq.rhs)).toBe('3');
  });

  it('should simulate full step-by-step peeling of canonical equation 2: 2[2+2{2+(2x-1)}] = 32 ➔ x = 3', () => {
    let eq = parseEquation('2[2 + 2{2 + (2x - 1)}] = 32');

    // Step 1: Peel outer multiplier 2 (/ 2)
    let peel = getPeelableNodes(eq.lhs, eq.targetVariable)[0];
    let res = applyMove(eq, peel.nodeId, '/');
    expect(res.success).toBe(true);
    eq = res.newEquation;
    // Simplify RHS 32 / 2 ➔ 16
    eq = applySimplification(eq, findSimplifications(eq.rhs)[0].nodeId).newEquation;
    expect(serializeToInfix(eq.rhs)).toBe('16');

    // Step 2: Peel addition + 2 (- 2)
    peel = getPeelableNodes(eq.lhs, eq.targetVariable)[0];
    res = applyMove(eq, peel.nodeId, '-');
    expect(res.success).toBe(true);
    eq = res.newEquation;
    // Simplify RHS 16 - 2 ➔ 14
    eq = applySimplification(eq, findSimplifications(eq.rhs)[0].nodeId).newEquation;
    expect(serializeToInfix(eq.rhs)).toBe('14');

    // Step 3: Peel outer multiplier 2 (/ 2)
    peel = getPeelableNodes(eq.lhs, eq.targetVariable)[0];
    res = applyMove(eq, peel.nodeId, '/');
    expect(res.success).toBe(true);
    eq = res.newEquation;
    // Simplify RHS 14 / 2 ➔ 7
    eq = applySimplification(eq, findSimplifications(eq.rhs)[0].nodeId).newEquation;
    expect(serializeToInfix(eq.rhs)).toBe('7');

    // Step 4: Peel addition + 2 (- 2)
    peel = getPeelableNodes(eq.lhs, eq.targetVariable)[0];
    res = applyMove(eq, peel.nodeId, '-');
    expect(res.success).toBe(true);
    eq = res.newEquation;
    // Simplify RHS 7 - 2 ➔ 5
    eq = applySimplification(eq, findSimplifications(eq.rhs)[0].nodeId).newEquation;
    expect(serializeToInfix(eq.rhs)).toBe('5');

    // Step 5: Peel subtraction - 1 (+ 1)
    peel = getPeelableNodes(eq.lhs, eq.targetVariable)[0];
    res = applyMove(eq, peel.nodeId, '+');
    expect(res.success).toBe(true);
    eq = res.newEquation;
    // Simplify RHS 5 + 1 ➔ 6
    eq = applySimplification(eq, findSimplifications(eq.rhs)[0].nodeId).newEquation;
    expect(serializeToInfix(eq.rhs)).toBe('6');

    // Step 6: Peel coefficient 2 (/ 2)
    peel = getPeelableNodes(eq.lhs, eq.targetVariable)[0];
    res = applyMove(eq, peel.nodeId, '/');
    expect(res.success).toBe(true);
    eq = res.newEquation;
    expect(eq.isSolved).toBe(true);
    expect(serializeToInfix(eq.lhs)).toBe('x');

    // Final simplify 6 / 2 ➔ 3
    eq = applySimplification(eq, findSimplifications(eq.rhs)[0].nodeId).newEquation;
    expect(serializeToInfix(eq.rhs)).toBe('3');
  });
});

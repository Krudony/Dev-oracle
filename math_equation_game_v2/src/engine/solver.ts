import type { EquationState, SolvabilityProof, SolverStep } from './types.ts';
import { cloneAST, evaluateConstantTree } from './ast.ts';
import { getPeelableNodes } from './validator.ts';
import { applyMove } from './transformer.ts';
import { findSimplifications, applySimplification } from './simplifier.ts';
import { Rational } from './rational.ts';
import { serializeEquation, serializeEquationLaTeX, serializeToInfix } from './serializer.ts';


/**
 * Solves an algebraic equation step-by-step using Reverse PEMDAS.
 * Produces a complete verification trace.
 */
export function solveEquation(initialEquation: EquationState, maxSteps: number = 30): SolvabilityProof {
  let currEq: EquationState = {
    ...initialEquation,
    lhs: cloneAST(initialEquation.lhs, false),
    rhs: cloneAST(initialEquation.rhs, false)
  };

  const steps: SolverStep[] = [];
  const validationErrors: string[] = [];
  let stepIndex = 0;

  while (stepIndex < maxSteps) {
    // 1. Check if solved
    if (currEq.lhs.type === 'variable' && currEq.lhs.name === currEq.targetVariable) {
      const finalVal = evaluateConstantTree(currEq.rhs) || new Rational(0, 1);
      return {
        isSolvable: true,
        targetVariable: currEq.targetVariable,
        verifiedSolution: finalVal,
        stepsCount: steps.length,
        steps,
        validationErrors
      };
    } else if (currEq.rhs.type === 'variable' && currEq.rhs.name === currEq.targetVariable) {
      const finalVal = evaluateConstantTree(currEq.lhs) || new Rational(0, 1);
      return {
        isSolvable: true,
        targetVariable: currEq.targetVariable,
        verifiedSolution: finalVal,
        stepsCount: steps.length,
        steps,
        validationErrors
      };
    }

    // 2. Check for RHS Simplification opportunities (e.g. 78/9 -> 26/3 or (26/3)*3 -> 26)
    const rhsSimplifications = findSimplifications(currEq.rhs);
    if (rhsSimplifications.length > 0) {
      const opp = rhsSimplifications[0];
      const res = applySimplification(currEq, opp.nodeId);
      if (res.success) {
        currEq = res.newEquation;
        const rhsVal = evaluateConstantTree(currEq.rhs) || new Rational(0, 1);
        steps.push({
          stepIndex: steps.length + 1,
          nodeIdToMove: opp.nodeId,
          actionType: opp.type === 'FRACTION_REDUCE' ? 'SIMPLIFY_FRACTION' : 'CONSTANT_FOLD',
          explanation: `Simplify ${opp.originalText} to ${opp.simplifiedText}`,
          resultingLHS: cloneAST(currEq.lhs),
          resultingRHS: rhsVal,
          equationLatex: serializeEquationLaTeX(currEq),
          equationInfix: serializeEquation(currEq)
        });
        stepIndex++;
        continue;
      }
    }

    // 3. Get peelable nodes from LHS or RHS
    let peelable = getPeelableNodes(currEq.lhs, currEq.targetVariable);
    if (peelable.length === 0) {
      peelable = getPeelableNodes(currEq.rhs, currEq.targetVariable);
      if (peelable.length === 0) {
        validationErrors.push(`No peelable nodes found on LHS or RHS: ${serializeToInfix(currEq.lhs)} = ${serializeToInfix(currEq.rhs)}`);
        break;
      }
    }

    const targetPeel = peelable[0];
    const moveRes = applyMove(currEq, targetPeel.nodeId, targetPeel.requiredInverseOp);

    if (!moveRes.success) {
      validationErrors.push(`Move failed for node ${targetPeel.nodeId}: ${moveRes.message}`);
      break;
    }

    currEq = moveRes.newEquation;
    const rhsVal = evaluateConstantTree(currEq.rhs) || new Rational(0, 1);

    steps.push({
      stepIndex: steps.length + 1,
      nodeIdToMove: targetPeel.nodeId,
      actionType: 'MOVE_TERM',
      inverseOp: targetPeel.requiredInverseOp,
      explanation: moveRes.message,
      resultingLHS: cloneAST(currEq.lhs),
      resultingRHS: rhsVal,
      equationLatex: serializeEquationLaTeX(currEq),
      equationInfix: serializeEquation(currEq)
    });

    stepIndex++;
  }

  const isLhsSolved = currEq.lhs.type === 'variable' && currEq.lhs.name === currEq.targetVariable;
  const isRhsSolved = currEq.rhs.type === 'variable' && currEq.rhs.name === currEq.targetVariable;
  const isSolved = isLhsSolved || isRhsSolved;
  const finalVal = isLhsSolved ? (evaluateConstantTree(currEq.rhs) || new Rational(0, 1)) 
                 : isRhsSolved ? (evaluateConstantTree(currEq.lhs) || new Rational(0, 1))
                 : new Rational(0, 1);

  return {
    isSolvable: isSolved,
    targetVariable: currEq.targetVariable,
    verifiedSolution: finalVal,
    stepsCount: steps.length,
    steps,
    validationErrors
  };
}

export const solveEquationStepByStep = solveEquation;


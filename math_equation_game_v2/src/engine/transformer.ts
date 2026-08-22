import type { ASTNode, BinaryOperator, EquationState, MoveResult } from './types.ts';
import { cloneAST, generateNodeId, findNodeById } from './ast.ts';
import { getPeelableNodes, diagnoseInvalidMove } from './validator.ts';
import { serializeToInfix } from './serializer.ts';


/**
 * Remove a peeled term from the LHS AST tree.
 */
export function removePeeledNodeFromLHS(lhs: ASTNode, peeledNodeId: string): ASTNode {
  // If top-level is a group, unwrap first
  if (lhs.type === 'group' && lhs.inner) {
    return unwrapOuterGroups(removePeeledNodeFromLHS(lhs.inner, peeledNodeId));
  }

  // Fraction: Denominator is peeled -> leaves numerator
  if (lhs.type === 'fraction' && lhs.numerator && lhs.denominator) {
    if (lhs.denominator.id === peeledNodeId) {
      return unwrapOuterGroups(lhs.numerator);
    }
    if (lhs.numerator.id === peeledNodeId) {
      return unwrapOuterGroups(lhs.denominator);
    }
  }

  // Binary operation: Left or Right child is peeled -> leaves remaining child
  if (lhs.type === 'binary' && lhs.left && lhs.right) {
    if (lhs.left.id === peeledNodeId) {
      if (lhs.op === '-') {
        return {
          id: generateNodeId('bin'),
          type: 'binary',
          op: '*',
          implicit: true,
          left: {
            id: generateNodeId('const'),
            type: 'constant',
            value: -1,
            fractionValue: { n: -1, d: 1 }
          },
          right: unwrapOuterGroups(lhs.right)
        };
      }
      return unwrapOuterGroups(lhs.right);
    }
    if (lhs.right.id === peeledNodeId) {
      return unwrapOuterGroups(lhs.left);
    }
  }

  return lhs;
}

/**
 * Unwraps redundant top-level grouping nodes.
 */
export function unwrapOuterGroups(node: ASTNode): ASTNode {
  let curr = node;
  while (curr.type === 'group' && curr.inner) {
    curr = curr.inner;
  }
  return curr;
}

/**
 * Attach the inverse operation to the RHS AST tree.
 */
export function attachInverseToRHS(
  currentRhs: ASTNode,
  peeledNode: ASTNode,
  inverseOp: BinaryOperator
): ASTNode {
  const clonedRhs = cloneAST(currentRhs, false);
  const clonedPeeled = cloneAST(peeledNode, false);

  if (inverseOp === '/') {
    // Division is rendered as a clean stacked vertical fraction
    return {
      id: generateNodeId('frac'),
      type: 'fraction',
      numerator: clonedRhs,
      denominator: clonedPeeled
    };
  }

  return {
    id: generateNodeId('bin'),
    type: 'binary',
    op: inverseOp,
    left: clonedRhs,
    right: clonedPeeled
  };
}

/**
 * Applies a verified inverse operation move across the equals sign.
 */
export function applyMove(
  equation: EquationState,
  selectedNodeId: string,
  userSelectedInverseOp: BinaryOperator
): MoveResult {
  let isLHS = true;
  let peelable = getPeelableNodes(equation.lhs, equation.targetVariable);
  let targetPeel = peelable.find(p => p.nodeId === selectedNodeId);

  if (!targetPeel) {
    peelable = getPeelableNodes(equation.rhs, equation.targetVariable);
    targetPeel = peelable.find(p => p.nodeId === selectedNodeId);
    isLHS = false;
  }

  if (!targetPeel) {
    // try diagnosing on both sides
    const errorDiag = diagnoseInvalidMove(equation.lhs, selectedNodeId, equation.targetVariable);
    if (errorDiag.errorCode !== 'WRONG_SIDE') {
      return {
        success: false,
        newEquation: equation,
        message: errorDiag.errorMessage || 'Invalid move! This term cannot be peeled yet.'
      };
    }
    const errorDiagRhs = diagnoseInvalidMove(equation.rhs, selectedNodeId, equation.targetVariable);
    return {
      success: false,
      newEquation: equation,
      message: errorDiagRhs.errorMessage || 'Invalid move! This term cannot be peeled yet.'
    };
  }

  if (userSelectedInverseOp !== targetPeel.requiredInverseOp) {
    const opNames: Record<BinaryOperator, string> = {
      '+': 'addition (+)',
      '-': 'subtraction (-)',
      '*': 'multiplication (×)',
      '/': 'division (÷)'
    };
    return {
      success: false,
      newEquation: equation,
      message: `Incorrect inverse operation! The opposite operation is ${opNames[targetPeel.requiredInverseOp]}.`
    };
  }

  const sourceSide = isLHS ? equation.lhs : equation.rhs;
  const targetSide = isLHS ? equation.rhs : equation.lhs;

  const peeledNode = findNodeById(sourceSide, selectedNodeId);
  if (!peeledNode) {
    return {
      success: false,
      newEquation: equation,
      message: 'Error: Peeled node not found in AST.'
    };
  }

  // 1. Remove peeled node from source side and unwrap redundant outer brackets
  const newSourceSide = unwrapOuterGroups(removePeeledNodeFromLHS(sourceSide, selectedNodeId));

  // 2. Attach inverse operation to target side
  const newTargetSide = attachInverseToRHS(targetSide, peeledNode, targetPeel.requiredInverseOp);

  // 3. Check if solved
  const isSolved = (newSourceSide.type === 'variable' && newSourceSide.name === equation.targetVariable) ||
                   (newTargetSide.type === 'variable' && newTargetSide.name === equation.targetVariable);

  const newEquation: EquationState = {
    ...equation,
    lhs: isLHS ? newSourceSide : newTargetSide,
    rhs: isLHS ? newTargetSide : newSourceSide,
    stepCount: equation.stepCount + 1,
    isSolved
  };

  const termText = serializeToInfix(peeledNode);
  const opSymbol = targetPeel.requiredInverseOp === '*' ? '×' : targetPeel.requiredInverseOp === '/' ? '÷' : targetPeel.requiredInverseOp;

  return {
    success: true,
    newEquation,
    message: isSolved
      ? `🎉 Amazing! You successfully isolated '${equation.targetVariable}'!`
      : `Awesome! Moved ${termText} using opposite operation '${opSymbol}'.`
  };
}

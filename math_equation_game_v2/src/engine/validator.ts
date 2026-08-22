import type { ASTNode, BinaryOperator, EquationState, ValidationResult } from './types.ts';
import { containsVariable, findNodeById, getPathToNode } from './ast.ts';
import { serializeToInfix } from './serializer.ts';


export interface PeelableNodeInfo {
  nodeId: string;
  node: ASTNode;
  requiredInverseOp: BinaryOperator;
  moveType: 'ADD_SUB' | 'COEFF_MULT' | 'FRAC_DENOM' | 'UNWRAP_GROUP';
  displayLabel: string;
}

/**
 * Determine all valid peelable nodes at the outermost layer of LHS.
 */
export function getPeelableNodes(lhs: ASTNode, targetVariable: string): PeelableNodeInfo[] {
  const peelable: PeelableNodeInfo[] = [];

  // If LHS is already the isolated target variable, nothing left to peel!
  if (lhs.type === 'variable' && lhs.name === targetVariable) {
    return peelable;
  }

  // 1. Redundant outer group at top level
  if (lhs.type === 'group' && lhs.inner) {
    // If the top-level is a group with no outer operator, recurse into inner
    return getPeelableNodes(lhs.inner, targetVariable);
  }

  // 2. Stacked Fraction
  if (lhs.type === 'fraction' && lhs.numerator && lhs.denominator) {
    const varInNum = containsVariable(lhs.numerator, targetVariable);
    const varInDen = containsVariable(lhs.denominator, targetVariable);

    if (varInNum && !varInDen) {
      peelable.push({
        nodeId: lhs.denominator.id,
        node: lhs.denominator,
        requiredInverseOp: '*',
        moveType: 'FRAC_DENOM',
        displayLabel: serializeToInfix(lhs.denominator)
      });
      return peelable;
    }

    if (varInDen && !varInNum) {
      peelable.push({
        nodeId: lhs.denominator.id,
        node: lhs.denominator,
        requiredInverseOp: '*',
        moveType: 'FRAC_DENOM',
        displayLabel: serializeToInfix(lhs.denominator)
      });
      return peelable;
    }
  }

  // 3. Binary Operations (+, -, *, /)
  if (lhs.type === 'binary' && lhs.left && lhs.right && lhs.op) {
    const varInLeft = containsVariable(lhs.left, targetVariable);
    const varInRight = containsVariable(lhs.right, targetVariable);

    // Addition & Subtraction (SADMEP / Reverse PEMDAS priority)
    if (lhs.op === '+' || lhs.op === '-') {
      if (varInLeft && !varInRight) {
        peelable.push({
          nodeId: lhs.right.id,
          node: lhs.right,
          requiredInverseOp: lhs.op === '+' ? '-' : '+',
          moveType: 'ADD_SUB',
          displayLabel: serializeToInfix(lhs.right)
        });
        return peelable;
      }

      if (varInRight && !varInLeft) {
        peelable.push({
          nodeId: lhs.left.id,
          node: lhs.left,
          requiredInverseOp: '-',
          moveType: 'ADD_SUB',
          displayLabel: serializeToInfix(lhs.left)
        });
        return peelable;
      }
    }

    // Multiplication (Coefficients or Outer Factors)
    if (lhs.op === '*') {
      if (varInRight && !varInLeft) {
        peelable.push({
          nodeId: lhs.left.id,
          node: lhs.left,
          requiredInverseOp: '/',
          moveType: 'COEFF_MULT',
          displayLabel: serializeToInfix(lhs.left)
        });
        return peelable;
      }

      if (varInLeft && !varInRight) {
        peelable.push({
          nodeId: lhs.right.id,
          node: lhs.right,
          requiredInverseOp: '/',
          moveType: 'COEFF_MULT',
          displayLabel: serializeToInfix(lhs.right)
        });
        return peelable;
      }
    }

    // Explicit Binary Division
    if (lhs.op === '/') {
      if (varInLeft && !varInRight) {
        peelable.push({
          nodeId: lhs.right.id,
          node: lhs.right,
          requiredInverseOp: '*',
          moveType: 'FRAC_DENOM',
          displayLabel: serializeToInfix(lhs.right)
        });
        return peelable;
      }
    }
  }

  return peelable;
}

/**
 * Diagnostic analysis for when a user clicks a locked/trapped node.
 */
export function diagnoseInvalidMove(
  lhs: ASTNode,
  selectedNodeId: string,
  targetVariable: string
): ValidationResult {
  const selectedNode = findNodeById(lhs, selectedNodeId);
  if (!selectedNode) {
    return {
      isValid: false,
      errorCode: 'WRONG_SIDE',
      errorMessage: 'Selected term is not on the left side of the equation.'
    };
  }

  // 1. User clicked the variable itself
  if (selectedNode.type === 'variable') {
    return {
      isValid: false,
      errorCode: 'VARIABLE_NODE_SELECTED',
      errorMessage: `You clicked '${selectedNode.name || targetVariable}'! Your goal is to isolate '${selectedNode.name || targetVariable}', so peel the other numbers away from it.`
    };
  }

  // 2. Trace path from LHS root to selected node
  const path = getPathToNode(lhs, selectedNodeId);
  if (!path || path.length <= 1) {
    return {
      isValid: false,
      errorCode: 'NOT_PEELABLE',
      errorMessage: 'This term cannot be moved right now.'
    };
  }

  // Traverse from outermost ancestor to innermost to find highest blocking barrier
  for (let i = 0; i < path.length - 1; i++) {
    const ancestor = path[i];

    // Trapped in Grouping / Bracket
    if (ancestor.type === 'group') {
      const bracketName =
        ancestor.bracketType === 'square'
          ? 'square [ ]'
          : ancestor.bracketType === 'curly'
          ? 'curly { }'
          : 'round ( )';
      return {
        isValid: false,
        errorCode: 'TRAPPED_IN_BRACKET',
        blockingAncestorId: ancestor.id,
        blockingDescription: `Trapped inside ${bracketName} brackets`,
        errorMessage: `This term is trapped inside the ${bracketName} brackets! Clear the outer numbers first before unpacking inside.`
      };
    }

    // Trapped in Fraction Numerator
    if (ancestor.type === 'fraction') {
      if (ancestor.numerator && containsVariable(ancestor.numerator, targetVariable) && ancestor.denominator) {
        const denText = serializeToInfix(ancestor.denominator);
        return {
          isValid: false,
          errorCode: 'TRAPPED_IN_NUMERATOR',
          blockingAncestorId: ancestor.denominator.id,
          blockingDescription: `Fraction denominator: ${denText}`,
          errorMessage: `This term is trapped in the numerator! You must clear the bottom denominator (${denText}) first.`
        };
      }
    }

    // Trapped behind Multiplier
    if (ancestor.type === 'binary' && ancestor.op === '*') {
      const coeff = ancestor.left && !containsVariable(ancestor.left, targetVariable) ? ancestor.left : ancestor.right;
      if (coeff) {
        const coeffText = serializeToInfix(coeff);
        return {
          isValid: false,
          errorCode: 'TRAPPED_IN_FACTOR',
          blockingAncestorId: coeff.id,
          blockingDescription: `Outer multiplier: ${coeffText}`,
          errorMessage: `Clear the outer multiplier (${coeffText}) in front of the expression first!`
        };
      }
    }

    // Trapped behind Additive Term
    if (ancestor.type === 'binary' && (ancestor.op === '+' || ancestor.op === '-')) {
      const outerTerm = ancestor.left && !containsVariable(ancestor.left, targetVariable) ? ancestor.left : ancestor.right;
      if (outerTerm) {
        const termText = serializeToInfix(outerTerm);
        return {
          isValid: false,
          errorCode: 'NOT_PEELABLE',
          blockingAncestorId: outerTerm.id,
          blockingDescription: `Outer addition/subtraction: ${termText}`,
          errorMessage: `You must peel away the outer addition/subtraction (${termText}) before opening this layer!`
        };
      }
    }
  }

  return {
    isValid: false,
    errorCode: 'NOT_PEELABLE',
    errorMessage: 'This term is locked! Follow Reverse PEMDAS to peel outer terms first.'
  };
}

/**
 * Validate a move action against the current equation state.
 */
export function validateMove(equation: EquationState, nodeId: string): ValidationResult {
  const peelable = getPeelableNodes(equation.lhs, equation.targetVariable);
  const matched = peelable.find(p => p.nodeId === nodeId);

  if (matched) {
    return {
      isValid: true,
      peelableNodeId: matched.nodeId,
      requiredInverseOp: matched.requiredInverseOp
    };
  }

  return diagnoseInvalidMove(equation.lhs, nodeId, equation.targetVariable);
}

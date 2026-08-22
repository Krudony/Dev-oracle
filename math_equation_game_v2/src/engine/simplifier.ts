import type { ASTNode, EquationState, SimplificationOpportunity } from './types.ts';
import { generateNodeId, isPureConstantTree, evaluateConstantTree } from './ast.ts';
import { simplifyFraction } from './rational.ts';
import { serializeToInfix } from './serializer.ts';


/**
 * Scan an AST tree for simplification opportunities.
 */
export function findSimplifications(root: ASTNode): SimplificationOpportunity[] {
  const opportunities: SimplificationOpportunity[] = [];

  function traverse(node: ASTNode) {
    // 1. Reducible Fraction Node
    if (node.type === 'fraction' && node.numerator && node.denominator) {
      if (node.isReducible && node.unsimplifiedFraction) {
        const { n, d } = node.unsimplifiedFraction;
        const { num, den, changed } = simplifyFraction(n, d);
        if (changed) {
          opportunities.push({
            nodeId: node.id,
            type: 'FRACTION_REDUCE',
            originalText: `${n}/${d}`,
            simplifiedText: den === 1 ? `${num}` : `${num}/${den}`,
            simplifiedNode:
              den === 1
                ? {
                    id: generateNodeId('const'),
                    type: 'constant',
                    value: num,
                    fractionValue: { n: num, d: 1 }
                  }
                : {
                    id: generateNodeId('frac'),
                    type: 'fraction',
                    numerator: { id: generateNodeId('const'), type: 'constant', value: num, fractionValue: { n: num, d: 1 } },
                    denominator: { id: generateNodeId('const'), type: 'constant', value: den, fractionValue: { n: den, d: 1 } }
                  }
          });
        }
      } else if (node.numerator.type === 'constant' && node.denominator.type === 'constant') {
        const n = node.numerator.value ?? node.numerator.fractionValue?.n ?? 0;
        const d = node.denominator.value ?? node.denominator.fractionValue?.n ?? 1;
        const { num, den, changed } = simplifyFraction(n, d);
        if (changed || den === 1) {
          opportunities.push({
            nodeId: node.id,
            type: 'FRACTION_REDUCE',
            originalText: `${n}/${d}`,
            simplifiedText: den === 1 ? `${num}` : `${num}/${den}`,
            simplifiedNode:
              den === 1
                ? {
                    id: generateNodeId('const'),
                    type: 'constant',
                    value: num,
                    fractionValue: { n: num, d: 1 }
                  }
                : {
                    id: generateNodeId('frac'),
                    type: 'fraction',
                    numerator: { id: generateNodeId('const'), type: 'constant', value: num, fractionValue: { n: num, d: 1 } },
                    denominator: { id: generateNodeId('const'), type: 'constant', value: den, fractionValue: { n: den, d: 1 } }
                  }
          });
        }
      }
    }

    // 2. Constant Binary Operations (e.g. 26/3 * 3 -> 26, 36 / 2 -> 18, 2 + 7 -> 9)
    if (node.type === 'binary' && isPureConstantTree(node)) {
      const exactVal = evaluateConstantTree(node);
      if (exactVal !== null && Number.isFinite(exactVal.toNumber())) {
        const originalText = serializeToInfix(node);
        const simplifiedText = exactVal.toString();

        // Only offer if it actually reduces the length/complexity of the expression
        if (originalText !== simplifiedText) {
          opportunities.push({
            nodeId: node.id,
            type: 'CONSTANT_FOLD',
            originalText,
            simplifiedText,
            simplifiedNode:
              exactVal.isInteger()
                ? {
                    id: generateNodeId('const'),
                    type: 'constant',
                    value: exactVal.n,
                    fractionValue: { n: exactVal.n, d: 1 }
                  }
                : {
                    id: generateNodeId('frac'),
                    type: 'fraction',
                    numerator: { id: generateNodeId('const'), type: 'constant', value: exactVal.n, fractionValue: { n: exactVal.n, d: 1 } },
                    denominator: { id: generateNodeId('const'), type: 'constant', value: exactVal.d, fractionValue: { n: exactVal.d, d: 1 } }
                  }
          });
        }
      }
    }

    // Recurse children
    if (node.left) traverse(node.left);
    if (node.right) traverse(node.right);
    if (node.numerator) traverse(node.numerator);
    if (node.denominator) traverse(node.denominator);
    if (node.inner) traverse(node.inner);
    if (node.operand) traverse(node.operand);
  }

  traverse(root);
  return opportunities;
}

/**
 * Replace a target node in an AST tree with a replacement node.
 */
function replaceNodeInTree(root: ASTNode, targetId: string, replacement: ASTNode): ASTNode {
  if (root.id === targetId) {
    return replacement;
  }

  const updated = { ...root };
  if (root.left) updated.left = replaceNodeInTree(root.left, targetId, replacement);
  if (root.right) updated.right = replaceNodeInTree(root.right, targetId, replacement);
  if (root.numerator) updated.numerator = replaceNodeInTree(root.numerator, targetId, replacement);
  if (root.denominator) updated.denominator = replaceNodeInTree(root.denominator, targetId, replacement);
  if (root.inner) updated.inner = replaceNodeInTree(root.inner, targetId, replacement);
  if (root.operand) updated.operand = replaceNodeInTree(root.operand, targetId, replacement);

  return updated;
}

/**
 * Apply a simplification to either LHS or RHS of the equation.
 */
export function applySimplification(
  equation: EquationState,
  nodeId: string
): { success: boolean; newEquation: EquationState; message: string } {
  // Check RHS simplifications first (most common after moving terms)
  const rhsOpps = findSimplifications(equation.rhs);
  const matchedRhs = rhsOpps.find(o => o.nodeId === nodeId);

  if (matchedRhs) {
    const newRhs = replaceNodeInTree(equation.rhs, nodeId, matchedRhs.simplifiedNode);
    return {
      success: true,
      newEquation: {
        ...equation,
        rhs: newRhs
      },
      message: `✨ Simplified ${matchedRhs.originalText} to ${matchedRhs.simplifiedText}!`
    };
  }

  // Check LHS simplifications
  const lhsOpps = findSimplifications(equation.lhs);
  const matchedLhs = lhsOpps.find(o => o.nodeId === nodeId);

  if (matchedLhs) {
    const newLhs = replaceNodeInTree(equation.lhs, nodeId, matchedLhs.simplifiedNode);
    return {
      success: true,
      newEquation: {
        ...equation,
        lhs: newLhs
      },
      message: `✨ Simplified ${matchedLhs.originalText} to ${matchedLhs.simplifiedText}!`
    };
  }

  return {
    success: false,
    newEquation: equation,
    message: 'No valid simplification found for this term.'
  };
}

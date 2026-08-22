import type { ASTNode, BracketType } from './types.ts';
import { Rational } from './rational.ts';

let idCounter = 0;

export function generateNodeId(prefix: string = 'node'): string {
  idCounter++;
  return `${prefix}_${Date.now()}_${idCounter}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

/**
 * Deep clone an AST subtree with optional ID regeneration.
 */
export function cloneAST(node: ASTNode, refreshIds: boolean = false): ASTNode {
  const newId = refreshIds ? generateNodeId(node.type) : node.id;
  const cloned: ASTNode = {
    ...node,
    id: newId,
    fractionValue: node.fractionValue ? { ...node.fractionValue } : undefined,
    unsimplifiedFraction: node.unsimplifiedFraction ? { ...node.unsimplifiedFraction } : undefined
  };

  if (node.left) cloned.left = cloneAST(node.left, refreshIds);
  if (node.right) cloned.right = cloneAST(node.right, refreshIds);
  if (node.numerator) cloned.numerator = cloneAST(node.numerator, refreshIds);
  if (node.denominator) cloned.denominator = cloneAST(node.denominator, refreshIds);
  if (node.inner) cloned.inner = cloneAST(node.inner, refreshIds);
  if (node.operand) cloned.operand = cloneAST(node.operand, refreshIds);

  return cloned;
}

/**
 * Find a node by ID anywhere in the AST.
 */
export function findNodeById(root: ASTNode, id: string): ASTNode | null {
  if (root.id === id) return root;
  if (root.left) {
    const found = findNodeById(root.left, id);
    if (found) return found;
  }
  if (root.right) {
    const found = findNodeById(root.right, id);
    if (found) return found;
  }
  if (root.numerator) {
    const found = findNodeById(root.numerator, id);
    if (found) return found;
  }
  if (root.denominator) {
    const found = findNodeById(root.denominator, id);
    if (found) return found;
  }
  if (root.inner) {
    const found = findNodeById(root.inner, id);
    if (found) return found;
  }
  if (root.operand) {
    const found = findNodeById(root.operand, id);
    if (found) return found;
  }
  return null;
}

export interface ParentContext {
  parent: ASTNode;
  relation: 'left' | 'right' | 'numerator' | 'denominator' | 'inner' | 'operand';
}

/**
 * Find the parent node and structural relationship for a given node ID.
 */
export function findParentNode(root: ASTNode, targetId: string): ParentContext | null {
  if (root.left && root.left.id === targetId) return { parent: root, relation: 'left' };
  if (root.right && root.right.id === targetId) return { parent: root, relation: 'right' };
  if (root.numerator && root.numerator.id === targetId) return { parent: root, relation: 'numerator' };
  if (root.denominator && root.denominator.id === targetId) return { parent: root, relation: 'denominator' };
  if (root.inner && root.inner.id === targetId) return { parent: root, relation: 'inner' };
  if (root.operand && root.operand.id === targetId) return { parent: root, relation: 'operand' };

  if (root.left) {
    const found = findParentNode(root.left, targetId);
    if (found) return found;
  }
  if (root.right) {
    const found = findParentNode(root.right, targetId);
    if (found) return found;
  }
  if (root.numerator) {
    const found = findParentNode(root.numerator, targetId);
    if (found) return found;
  }
  if (root.denominator) {
    const found = findParentNode(root.denominator, targetId);
    if (found) return found;
  }
  if (root.inner) {
    const found = findParentNode(root.inner, targetId);
    if (found) return found;
  }
  if (root.operand) {
    const found = findParentNode(root.operand, targetId);
    if (found) return found;
  }
  return null;
}

/**
 * Get path from root down to the target node.
 */
export function getPathToNode(root: ASTNode, targetId: string): ASTNode[] | null {
  if (root.id === targetId) return [root];

  const searchIn = (child?: ASTNode): ASTNode[] | null => {
    if (!child) return null;
    const path = getPathToNode(child, targetId);
    if (path) return [root, ...path];
    return null;
  };

  return (
    searchIn(root.left) ||
    searchIn(root.right) ||
    searchIn(root.numerator) ||
    searchIn(root.denominator) ||
    searchIn(root.inner) ||
    searchIn(root.operand)
  );
}

/**
 * Check if an AST subtree contains a specific variable.
 */
export function containsVariable(root: ASTNode, varName?: string): boolean {
  if (root.type === 'variable') {
    return varName === undefined || root.name === varName;
  }
  if (root.left && containsVariable(root.left, varName)) return true;
  if (root.right && containsVariable(root.right, varName)) return true;
  if (root.numerator && containsVariable(root.numerator, varName)) return true;
  if (root.denominator && containsVariable(root.denominator, varName)) return true;
  if (root.inner && containsVariable(root.inner, varName)) return true;
  if (root.operand && containsVariable(root.operand, varName)) return true;
  return false;
}

/**
 * Collect all variable names present in the AST.
 */
export function collectVariables(root: ASTNode): string[] {
  const vars = new Set<string>();
  function traverse(node: ASTNode) {
    if (node.type === 'variable' && node.name) {
      vars.add(node.name);
    }
    if (node.left) traverse(node.left);
    if (node.right) traverse(node.right);
    if (node.numerator) traverse(node.numerator);
    if (node.denominator) traverse(node.denominator);
    if (node.inner) traverse(node.inner);
    if (node.operand) traverse(node.operand);
  }
  traverse(root);
  return Array.from(vars);
}

/**
 * Check if an AST subtree consists solely of numeric constants (no variables).
 */
export function isPureConstantTree(root: ASTNode): boolean {
  return !containsVariable(root);
}

/**
 * Evaluate a constant subtree to an exact Rational value.
 */
export function evaluateConstantTree(root: ASTNode): Rational | null {
  if (!isPureConstantTree(root)) return null;

  switch (root.type) {
    case 'constant':
      if (root.fractionValue) {
        return new Rational(root.fractionValue.n, root.fractionValue.d);
      }
      return new Rational(root.value ?? 0, 1);

    case 'fraction': {
      if (!root.numerator || !root.denominator) return null;
      const num = evaluateConstantTree(root.numerator);
      const den = evaluateConstantTree(root.denominator);
      if (!num || !den || den.n === 0) return null;
      return num.div(den);
    }

    case 'group':
      return root.inner ? evaluateConstantTree(root.inner) : null;

    case 'unary': {
      if (!root.operand) return null;
      const opVal = evaluateConstantTree(root.operand);
      return opVal ? opVal.mul(-1) : null;
    }

    case 'binary': {
      if (!root.left || !root.right || !root.op) return null;
      const leftVal = evaluateConstantTree(root.left);
      const rightVal = evaluateConstantTree(root.right);
      if (!leftVal || !rightVal) return null;

      switch (root.op) {
        case '+':
          return leftVal.add(rightVal);
        case '-':
          return leftVal.sub(rightVal);
        case '*':
          return leftVal.mul(rightVal);
        case '/':
          if (rightVal.n === 0) return null;
          return leftVal.div(rightVal);
      }
    }
  }

  return null;
}

/**
 * Measure max nesting depth of grouping brackets in an AST subtree.
 */
export function countGroupingDepth(root: ASTNode): number {
  let maxChildDepth = 0;

  const check = (child?: ASTNode) => {
    if (child) {
      maxChildDepth = Math.max(maxChildDepth, countGroupingDepth(child));
    }
  };

  check(root.left);
  check(root.right);
  check(root.numerator);
  check(root.denominator);
  check(root.inner);
  check(root.operand);

  return root.type === 'group' ? maxChildDepth + 1 : maxChildDepth;
}

/**
 * Determine appropriate bracket type based on child grouping depth.
 */
export function getBracketTypeForDepth(depth: number): BracketType {
  if (depth <= 0) return 'round';
  if (depth === 1) return 'curly';
  return 'square';
}

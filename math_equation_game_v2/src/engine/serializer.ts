import type { ASTNode, EquationState } from './types.ts';

/**
 * Serializes an AST node to a clean infix mathematical string.
 */
export function serializeToInfix(node: ASTNode, wrapParens: boolean = false): string {
  switch (node.type) {
    case 'variable':
      return node.name || 'x';

    case 'constant':
      if (node.unsimplifiedFraction) {
        return `${node.unsimplifiedFraction.n}/${node.unsimplifiedFraction.d}`;
      }
      if (node.fractionValue && node.fractionValue.d !== 1) {
        return `${node.fractionValue.n}/${node.fractionValue.d}`;
      }
      return `${node.value ?? (node.fractionValue ? node.fractionValue.n : 0)}`;

    case 'fraction': {
      const numStr = serializeToInfix(node.numerator!);
      const denStr = serializeToInfix(node.denominator!);
      const numFormatted = numStr.startsWith('(') && numStr.endsWith(')') ? numStr : `(${numStr})`;
      const denFormatted =
        node.denominator?.type === 'constant' || node.denominator?.type === 'variable'
          ? denStr
          : `(${denStr})`;
      const res = `${numFormatted} / ${denFormatted}`;
      return wrapParens ? `(${res})` : res;
    }

    case 'group': {
      const innerStr = serializeToInfix(node.inner!);
      if (node.bracketType === 'square') return `[${innerStr}]`;
      if (node.bracketType === 'curly') return `{${innerStr}}`;
      return `(${innerStr})`;
    }

    case 'unary': {
      const opStr = serializeToInfix(node.operand!, true);
      return `-${opStr}`;
    }

    case 'binary': {
      const leftStr = serializeToInfix(node.left!);
      const rightStr = serializeToInfix(node.right!);

      if (node.op === '*') {
        if (node.implicit) {
          // If right is variable or group, don't use space
          if (node.right!.type === 'variable' || node.right!.type === 'group') {
            return `${leftStr}${rightStr}`;
          }
          return `${leftStr} * ${rightStr}`;
        }
        return `${leftStr} * ${rightStr}`;
      }

      if (node.op === '/') {
        return `(${leftStr}) / (${rightStr})`;
      }

      const res = `${leftStr} ${node.op} ${rightStr}`;
      return wrapParens ? `(${res})` : res;
    }
  }
}

/**
 * Serializes an AST node to authentic LaTeX with vertical fractions and tiered brackets.
 */
export function serializeToLaTeX(node: ASTNode): string {
  switch (node.type) {
    case 'variable':
      return node.name || 'x';

    case 'constant':
      if (node.unsimplifiedFraction) {
        return `\\frac{${node.unsimplifiedFraction.n}}{${node.unsimplifiedFraction.d}}`;
      }
      if (node.fractionValue && node.fractionValue.d !== 1) {
        return `\\frac{${node.fractionValue.n}}{${node.fractionValue.d}}`;
      }
      return `${node.value ?? (node.fractionValue ? node.fractionValue.n : 0)}`;

    case 'fraction': {
      const num = serializeToLaTeX(node.numerator!);
      const den = serializeToLaTeX(node.denominator!);
      return `\\frac{${num}}{${den}}`;
    }

    case 'group': {
      const inner = serializeToLaTeX(node.inner!);
      if (node.bracketType === 'square') return `\\left[${inner}\\right]`;
      if (node.bracketType === 'curly') return `\\left\\{${inner}\\right\\}`;
      return `\\left(${inner}\\right)`;
    }

    case 'unary':
      return `-${serializeToLaTeX(node.operand!)}`;

    case 'binary': {
      const left = serializeToLaTeX(node.left!);
      const right = serializeToLaTeX(node.right!);

      if (node.op === '*') {
        if (node.implicit) {
          return `${left}${right}`;
        }
        return `${left} \\cdot ${right}`;
      }

      if (node.op === '/') {
        return `\\frac{${left}}{${right}}`;
      }

      return `${left} ${node.op} ${right}`;
    }
  }
}

/**
 * Serializes an entire equation state to infix equation string.
 */
export function serializeEquation(equation: EquationState): string {
  return `${serializeToInfix(equation.lhs)} = ${serializeToInfix(equation.rhs)}`;
}

/**
 * Serializes an entire equation state to LaTeX.
 */
export function serializeEquationLaTeX(equation: EquationState): string {
  return `${serializeToLaTeX(equation.lhs)} = ${serializeToLaTeX(equation.rhs)}`;
}

/**
 * Returns a short display representation of a specific node (for tooltips and modals).
 */
export function getDisplayTerm(node: ASTNode): string {
  switch (node.type) {
    case 'variable':
      return node.name || 'x';
    case 'constant':
      if (node.unsimplifiedFraction) return `${node.unsimplifiedFraction.n}/${node.unsimplifiedFraction.d}`;
      if (node.fractionValue && node.fractionValue.d !== 1) return `${node.fractionValue.n}/${node.fractionValue.d}`;
      return `${node.value ?? (node.fractionValue?.n ?? 0)}`;
    case 'fraction':
      return `${serializeToInfix(node.numerator!)} / ${serializeToInfix(node.denominator!)}`;
    case 'group':
      return `[group]`;
    case 'binary':
      return serializeToInfix(node);
    case 'unary':
      return `-${serializeToInfix(node.operand!)}`;
  }
}

export const serializeEquationToLaTeX = serializeEquationLaTeX;
export const serializeEquationToString = serializeEquation;
export const serializeEquationToInfix = serializeEquation;




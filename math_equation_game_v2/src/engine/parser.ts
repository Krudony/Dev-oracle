import type { ASTNode, BracketType, EquationState } from './types.ts';
import { generateNodeId, collectVariables } from './ast.ts';
import { Rational } from './rational.ts';


export type TokenType =
  | 'NUMBER'
  | 'VARIABLE'
  | 'PLUS'
  | 'MINUS'
  | 'STAR'
  | 'SLASH'
  | 'EQUALS'
  | 'LPAREN'
  | 'RPAREN'
  | 'LBRACKET'
  | 'RBRACKET'
  | 'LBRACE'
  | 'RBRACE'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

export class MathParser {
  private tokens: Token[] = [];
  private pos = 0;

  /**
   * Tokenize an algebraic expression string.
   */
  public tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    const len = input.length;

    while (i < len) {
      const char = input[i];

      // Skip whitespace
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // Numbers (integers or decimals)
      if (/[0-9]/.test(char)) {
        let numStr = '';
        const startPos = i;
        while (i < len && (/[0-9]/.test(input[i]) || input[i] === '.')) {
          numStr += input[i];
          i++;
        }
        tokens.push({ type: 'NUMBER', value: numStr, pos: startPos });
        continue;
      }

      // Variables (single letter a-z, A-Z)
      if (/[a-zA-Z]/.test(char)) {
        tokens.push({ type: 'VARIABLE', value: char, pos: i });
        i++;
        continue;
      }

      // Operators and grouping symbols
      switch (char) {
        case '+':
          tokens.push({ type: 'PLUS', value: '+', pos: i });
          break;
        case '-':
          tokens.push({ type: 'MINUS', value: '-', pos: i });
          break;
        case '*':
        case '×':
        case '·':
          tokens.push({ type: 'STAR', value: '*', pos: i });
          break;
        case '/':
        case '÷':
          tokens.push({ type: 'SLASH', value: '/', pos: i });
          break;
        case '=':
          tokens.push({ type: 'EQUALS', value: '=', pos: i });
          break;
        case '(':
          tokens.push({ type: 'LPAREN', value: '(', pos: i });
          break;
        case ')':
          tokens.push({ type: 'RPAREN', value: ')', pos: i });
          break;
        case '[':
          tokens.push({ type: 'LBRACKET', value: '[', pos: i });
          break;
        case ']':
          tokens.push({ type: 'RBRACKET', value: ']', pos: i });
          break;
        case '{':
          tokens.push({ type: 'LBRACE', value: '{', pos: i });
          break;
        case '}':
          tokens.push({ type: 'RBRACE', value: '}', pos: i });
          break;
        default:
          throw new Error(`Unexpected character '${char}' at index ${i}`);
      }
      i++;
    }

    tokens.push({ type: 'EOF', value: '', pos: len });
    return tokens;
  }

  /**
   * Parse a complete algebraic equation (e.g. "13(3m-7)/3 = 78/9").
   */
  public parseEquation(input: string): EquationState {
    const trimmed = input.trim();
    const parts = trimmed.split('=');
    if (parts.length !== 2) {
      throw new Error(`Equation must contain exactly one equals sign (=). Found ${parts.length - 1}.`);
    }

    const lhs = this.parseExpression(parts[0].trim());
    const rhs = this.parseExpression(parts[1].trim());
    const vars = Array.from(new Set([...collectVariables(lhs), ...collectVariables(rhs)]));
    const targetVar = vars.length > 0 ? vars[0] : 'x';

    // Check if RHS is reducible fraction
    if (rhs.type === 'fraction' && rhs.numerator?.type === 'constant' && rhs.denominator?.type === 'constant') {
      const n = rhs.numerator.value ?? rhs.numerator.fractionValue?.n ?? 0;
      const d = rhs.denominator.value ?? rhs.denominator.fractionValue?.n ?? 1;
      const g = Rational.gcd(n, d);
      if (g > 1) {
        rhs.isReducible = true;
        rhs.unsimplifiedFraction = { n, d };
      }
    }

    return {
      id: generateNodeId('eq'),
      lhs,
      rhs,
      targetVariable: targetVar,
      solution: { n: 0, d: 1 }, // Solved on demand or provided by generator
      stepCount: 0,
      isSolved: lhs.type === 'variable' && lhs.name === targetVar,
      initialEquationStr: trimmed
    };
  }

  /**
   * Parse an algebraic expression into an AST subtree.
   */
  public parseExpression(input: string): ASTNode {
    this.tokens = this.tokenize(input);
    this.pos = 0;
    const ast = this.parseBinary(0);
    if (this.peek().type !== 'EOF') {
      throw new Error(`Unexpected token '${this.peek().value}' after valid expression.`);
    }
    return ast;
  }

  private peek(): Token {
    return this.tokens[this.pos] || { type: 'EOF', value: '', pos: 0 };
  }

  private consume(): Token {
    const tok = this.peek();
    this.pos++;
    return tok;
  }

  private getPrecedence(tok: Token): number {
    switch (tok.type) {
      case 'PLUS':
      case 'MINUS':
        return 10;
      case 'STAR':
      case 'SLASH':
        return 20;
      default:
        return -1;
    }
  }

  private isImplicitMultiplyNext(): boolean {
    const tok = this.peek();
    // Implicit multiplication occurs if next token is NUMBER, VARIABLE, LPAREN, LBRACKET, LBRACE
    return (
      tok.type === 'VARIABLE' ||
      tok.type === 'LPAREN' ||
      tok.type === 'LBRACKET' ||
      tok.type === 'LBRACE'
    );
  }

  private parseBinary(minPrecedence: number): ASTNode {
    let left = this.parseUnary();

    while (this.pos < this.tokens.length) {
      // Check for implicit multiplication (e.g., 2x, 13(3m-7), 2[...])
      if (this.isImplicitMultiplyNext()) {
        const implicitPrec = 25; // higher than explicit * and /
        if (implicitPrec < minPrecedence) break;

        const right = this.parseBinary(implicitPrec);
        left = {
          id: generateNodeId('bin'),
          type: 'binary',
          op: '*',
          left,
          right,
          implicit: true
        };
        continue;
      }

      const tok = this.peek();
      const prec = this.getPrecedence(tok);
      if (prec < minPrecedence || prec === -1) {
        break;
      }

      this.consume(); // consume operator
      const right = this.parseBinary(prec + 1);

      if (tok.type === 'SLASH') {
        left = {
          id: generateNodeId('frac'),
          type: 'fraction',
          numerator: left,
          denominator: right
        };
      } else {
        const op = tok.type === 'PLUS' ? '+' : tok.type === 'MINUS' ? '-' : '*';
        left = {
          id: generateNodeId('bin'),
          type: 'binary',
          op,
          left,
          right
        };
      }
    }

    return left;
  }

  private parseUnary(): ASTNode {
    const tok = this.peek();
    if (tok.type === 'MINUS') {
      this.consume();
      const operand = this.parseUnary();
      return {
        id: generateNodeId('unary'),
        type: 'unary',
        operand
      };
    }
    if (tok.type === 'PLUS') {
      this.consume();
      return this.parseUnary();
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ASTNode {
    const tok = this.consume();

    if (tok.type === 'NUMBER') {
      const num = parseFloat(tok.value);
      return {
        id: generateNodeId('const'),
        type: 'constant',
        value: num,
        fractionValue: { n: Math.round(num), d: 1 }
      };
    }

    if (tok.type === 'VARIABLE') {
      return {
        id: generateNodeId('var'),
        type: 'variable',
        name: tok.value
      };
    }

    if (tok.type === 'LPAREN' || tok.type === 'LBRACKET' || tok.type === 'LBRACE') {
      const bracketType: BracketType =
        tok.type === 'LPAREN' ? 'round' : tok.type === 'LBRACKET' ? 'square' : 'curly';
      const expectedClose = tok.type === 'LPAREN' ? 'RPAREN' : tok.type === 'LBRACKET' ? 'RBRACKET' : 'RBRACE';

      const inner = this.parseBinary(0);
      const closeTok = this.consume();
      if (closeTok.type !== expectedClose) {
        throw new Error(
          `Expected closing bracket '${expectedClose}' for opening '${tok.value}', got '${closeTok.value}'`
        );
      }

      return {
        id: generateNodeId('grp'),
        type: 'group',
        bracketType,
        inner
      };
    }

    throw new Error(`Unexpected token '${tok.value}' (type: ${tok.type}) at position ${tok.pos}`);
  }
}

export const mathParser = new MathParser();

export function parseEquation(input: string): EquationState {
  return mathParser.parseEquation(input);
}

export function parseExpression(input: string): ASTNode {
  return mathParser.parseExpression(input);
}

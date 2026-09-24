/** Exact, bounded ordinary arithmetic. This evaluator is independent of any proof service. */
export type Rational = { numerator: bigint; denominator: bigint };

export type ArithmeticLiteral = {
  /** The numeral as typed. Unary signs are separate operators. */
  text: string;
  /** UTF-16 offsets into the original input, with an exclusive end. */
  start: number;
  end: number;
};

export type ArithmeticResult =
  | { ok: true; value: Rational; formatted: string; literals: ArithmeticLiteral[] }
  | { ok: false; error: string };

export const ARITHMETIC_LIMITS = Object.freeze({
  sourceLength: 512,
  literalDigits: 60,
  nesting: 32,
  valueDigits: 256,
  decimalPlaces: 60,
});

type Operator = '+' | '-' | '*' | '/';
type Token = { kind: 'number'; value: Rational } | { kind: Operator | '(' | ')' | 'end' };

class ArithmeticError extends Error {}

const absolute = (value: bigint) => (value < 0n ? -value : value);

function gcd(left: bigint, right: bigint): bigint {
  while (right !== 0n) [left, right] = [right, left % right];
  return left;
}

function rational(numerator: bigint, denominator: bigint): Rational {
  if (denominator === 0n)
    throw new ArithmeticError('Division by zero has no value here. Try a nonzero divisor.');
  if (numerator === 0n) return { numerator: 0n, denominator: 1n };
  const divisor = gcd(absolute(numerator), absolute(denominator));
  const sign = denominator < 0n ? -1n : 1n;
  numerator = (numerator / divisor) * sign;
  denominator = absolute(denominator) / divisor;
  if (
    absolute(numerator).toString().length > ARITHMETIC_LIMITS.valueDigits ||
    denominator.toString().length > ARITHMETIC_LIMITS.valueDigits
  )
    throw new ArithmeticError(
      'This calculation grows too large. Try smaller numbers or fewer steps.',
    );
  return { numerator, denominator };
}

/** Integers and short terminating decimals stay familiar; other results remain exact fractions. */
export function formatRational(value: Rational): string {
  const { numerator, denominator } = rational(value.numerator, value.denominator);
  if (denominator === 1n) return numerator.toString();

  let remaining = denominator;
  let twos = 0;
  let fives = 0;
  while (remaining % 2n === 0n) {
    remaining /= 2n;
    twos++;
  }
  while (remaining % 5n === 0n) {
    remaining /= 5n;
    fives++;
  }
  const places = Math.max(twos, fives);
  if (remaining !== 1n || places > ARITHMETIC_LIMITS.decimalPlaces)
    return `${numerator}/${denominator}`;

  const scaled = (absolute(numerator) * 10n ** BigInt(places)) / denominator;
  const digits = scaled.toString().padStart(places + 1, '0');
  const split = digits.length - places;
  return `${numerator < 0n ? '-' : ''}${digits.slice(0, split)}.${digits.slice(split)}`;
}

function tokenize(source: string): { tokens: Token[]; literals: ArithmeticLiteral[] } {
  const tokens: Token[] = [];
  const literals: ArithmeticLiteral[] = [];
  let cursor = 0;
  while (cursor < source.length) {
    const character = source[cursor];
    if (/\s/.test(character)) {
      cursor++;
      continue;
    }
    if (/[0-9.]/.test(character)) {
      const match = /^(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)/.exec(source.slice(cursor));
      if (!match) throw new ArithmeticError('A decimal point needs a number beside it. Try 0.5.');
      const text = match[0];
      if (text.replace('.', '').length > ARITHMETIC_LIMITS.literalDigits)
        throw new ArithmeticError(
          `Use at most ${ARITHMETIC_LIMITS.literalDigits} digits per number.`,
        );
      const [whole = '', fractional = ''] = text.split('.');
      tokens.push({
        kind: 'number',
        value: rational(BigInt(`${whole || '0'}${fractional}`), 10n ** BigInt(fractional.length)),
      });
      literals.push({ text, start: cursor, end: cursor + text.length });
      cursor += text.length;
      continue;
    }
    if (character === '^' || /[eE]/.test(character) || source.slice(cursor, cursor + 2) === '**')
      throw new ArithmeticError('Powers and scientific notation are not supported yet.');
    const normal =
      character === '−' ? '-' : character === '×' ? '*' : character === '÷' ? '/' : character;
    if (
      normal !== '+' &&
      normal !== '-' &&
      normal !== '*' &&
      normal !== '/' &&
      normal !== '(' &&
      normal !== ')'
    )
      throw new ArithmeticError(
        'Use numbers, +, −, ×, ÷, and parentheses. Use a dot for decimals.',
      );
    tokens.push({ kind: normal });
    cursor++;
  }
  tokens.push({ kind: 'end' });
  return { tokens, literals };
}

function calculate(left: Rational, operator: Operator, right: Rational): Rational {
  if (operator === '+')
    return rational(
      left.numerator * right.denominator + right.numerator * left.denominator,
      left.denominator * right.denominator,
    );
  if (operator === '-')
    return rational(
      left.numerator * right.denominator - right.numerator * left.denominator,
      left.denominator * right.denominator,
    );
  if (operator === '*')
    return rational(left.numerator * right.numerator, left.denominator * right.denominator);
  return rational(left.numerator * right.denominator, left.denominator * right.numerator);
}

class Parser {
  private cursor = 0;

  constructor(private readonly tokens: Token[]) {}

  private current(): Token {
    return this.tokens[this.cursor];
  }

  parse(): Rational {
    const value = this.expression(0);
    const token = this.current();
    if (token.kind === ')')
      throw new ArithmeticError('This closing parenthesis has no opening one.');
    if (token.kind !== 'end')
      throw new ArithmeticError(
        'Put an operation between numbers or before an opening parenthesis.',
      );
    return value;
  }

  private expression(depth: number): Rational {
    let value = this.term(depth);
    while (this.current().kind === '+' || this.current().kind === '-') {
      const operator = this.current().kind as Operator;
      this.cursor++;
      value = calculate(value, operator, this.term(depth));
    }
    return value;
  }

  private term(depth: number): Rational {
    let value = this.factor(depth);
    while (this.current().kind === '*' || this.current().kind === '/') {
      const operator = this.current().kind as Operator;
      this.cursor++;
      value = calculate(value, operator, this.factor(depth));
    }
    return value;
  }

  private factor(depth: number): Rational {
    if (depth > ARITHMETIC_LIMITS.nesting)
      throw new ArithmeticError(
        'There are too many nested signs or parentheses. Try fewer layers.',
      );
    const token = this.current();
    if (token.kind === '+' || token.kind === '-') {
      this.cursor++;
      const value = this.factor(depth + 1);
      return token.kind === '-' ? { ...value, numerator: -value.numerator } : value;
    }
    if (token.kind === 'number') {
      this.cursor++;
      return token.value;
    }
    if (token.kind === '(') {
      this.cursor++;
      const value = this.expression(depth + 1);
      if (this.current().kind !== ')')
        throw new ArithmeticError('Close the parenthesis, or add a missing operation inside it.');
      this.cursor++;
      return value;
    }
    if (token.kind === 'end') throw new ArithmeticError('Add a number to finish the calculation.');
    throw new ArithmeticError('A number is missing here. Try a number or an opening parenthesis.');
  }
}

/** Parse without executing source code. Every successful value is a reduced exact rational. */
export function evaluateArithmetic(source: string): ArithmeticResult {
  if (source.length > ARITHMETIC_LIMITS.sourceLength)
    return {
      ok: false,
      error: `Try a calculation of at most ${ARITHMETIC_LIMITS.sourceLength} characters.`,
    };
  if (!source.trim()) return { ok: false, error: 'Write a calculation, such as 2 + 2.' };
  try {
    const { tokens, literals } = tokenize(source);
    const value = new Parser(tokens).parse();
    return { ok: true, value, formatted: formatRational(value), literals };
  } catch (error) {
    if (error instanceof ArithmeticError) return { ok: false, error: error.message };
    throw error;
  }
}

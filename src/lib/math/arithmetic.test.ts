import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ARITHMETIC_LIMITS, evaluateArithmetic, formatRational } from './arithmetic';

function evaluated(source: string) {
  const result = evaluateArithmetic(source);
  if (!result.ok) assert.fail(`${source}: ${result.error}`);
  return result;
}

function rejected(source: string) {
  const result = evaluateArithmetic(source);
  if (result.ok) assert.fail(`Expected rejection: ${source}`);
  assert.ok(result.error.length > 0);
  return result.error;
}

test('familiar arithmetic respects precedence and left associativity', () => {
  const cases = [
    ['2 + 2', '4'],
    ['2 + 3 * 4', '14'],
    ['(2 + 3) * 4', '20'],
    ['12 / 3 * 2', '8'],
    ['10 - 3 - 2', '5'],
    ['24 / (2 * 3)', '4'],
    ['2 × (3 + 4) − 8 ÷ 2', '10'],
    [' 2\n +\t2 ', '4'],
  ];
  for (const [source, expected] of cases) assert.equal(evaluated(source).formatted, expected);
});

test('unary signs work on numbers and parentheses without changing binary precedence', () => {
  const cases = [
    ['-2 + 5', '3'],
    ['2 * -3', '-6'],
    ['2--3', '5'],
    ['2+-3', '-1'],
    ['-(2 + 3)', '-5'],
    ['--2', '2'],
    ['−.5 ÷ −2', '0.25'],
    ['-0', '0'],
    ['+2', '2'],
  ];
  for (const [source, expected] of cases) assert.equal(evaluated(source).formatted, expected);
});

test('decimals and arithmetic beyond binary floating-point precision stay exact', () => {
  assert.deepEqual(evaluated('0.1 + 0.2').value, { numerator: 3n, denominator: 10n });
  assert.equal(evaluated('0.1 + 0.2').formatted, '0.3');
  assert.equal(evaluated('0.3 - 0.1 - 0.2').formatted, '0');
  assert.equal(evaluated('9007199254740993 + 2').formatted, '9007199254740995');
  assert.equal(evaluated('0002.5000 + .5').formatted, '3');
  assert.equal(evaluated('2. + .125').formatted, '2.125');
  assert.equal(evaluated('1 / 8').formatted, '0.125');
  assert.equal(evaluated('1 / 40').formatted, '0.025');
});

test('fractions reduce exactly with positive denominators and canonical zero', () => {
  assert.deepEqual(evaluated('2 / -6').value, { numerator: -1n, denominator: 3n });
  assert.equal(evaluated('1/3').formatted, '1/3');
  assert.equal(evaluated('1/3 + 1/6').formatted, '0.5');
  assert.equal(evaluated('(2/3) / (4/9)').formatted, '1.5');
  assert.deepEqual(evaluated('0 / -3').value, { numerator: 0n, denominator: 1n });
  assert.equal(formatRational({ numerator: 6n, denominator: -8n }), '-0.75');
  assert.equal(formatRational({ numerator: 0n, denominator: -3n }), '0');
  assert.equal(formatRational({ numerator: 1n, denominator: 2n ** 61n }), `1/${2n ** 61n}`);
});

test('literal spans preserve input text and exclude signs and operators', () => {
  const source = ' −02.50 + (.5 × 3) ';
  const { literals } = evaluated(source);
  assert.deepEqual(literals, [
    { text: '02.50', start: 2, end: 7 },
    { text: '.5', start: 11, end: 13 },
    { text: '3', start: 16, end: 17 },
  ]);
  for (const literal of literals)
    assert.equal(source.slice(literal.start, literal.end), literal.text);
});

test('partial and malformed input cannot silently produce a result', () => {
  for (const source of [
    '',
    ' ',
    '+',
    '2 +',
    '2 /',
    '.',
    '1..2',
    '1.2.3',
    '2 2',
    '2(3)',
    '(2)(3)',
    '()',
    '(2 + 3',
    '2 + 3)',
    '2*/3',
    '2//3',
    '*2',
    '2 = 2',
    '1,000 + 1',
  ])
    rejected(source);
});

test('division by zero fails even when zero comes from a subexpression', () => {
  for (const source of ['1/0', '0/0', '1/-0', '2/(3-3)', '1/(0.3-0.1-0.2)'])
    assert.match(rejected(source), /zero/);
});

test('powers, code, variables, and nonnumeric spellings are not evaluated', () => {
  for (const source of ['2^3', '2**3', '1e3', '1E-2'])
    assert.match(rejected(source), /not supported/);
  for (const source of [
    'NaN',
    'Infinity',
    '0x10',
    '2n',
    'Math.random()',
    'process.exit()',
    '1; 2',
    'globalThis.value=1',
  ])
    rejected(source);
});

test('input length, numeral size, nesting, and intermediate sizes stay bounded', () => {
  assert.match(rejected('1'.repeat(ARITHMETIC_LIMITS.sourceLength + 1)), /characters/);
  assert.equal(evaluated('9'.repeat(ARITHMETIC_LIMITS.literalDigits)).formatted.length, 60);
  assert.match(rejected('9'.repeat(ARITHMETIC_LIMITS.literalDigits + 1)), /digits/);
  const levels = ARITHMETIC_LIMITS.nesting;
  assert.equal(evaluated('('.repeat(levels) + '1' + ')'.repeat(levels)).formatted, '1');
  assert.match(rejected('('.repeat(levels + 1) + '1' + ')'.repeat(levels + 1)), /layers/);
  assert.match(rejected('-'.repeat(levels + 1) + '1'), /layers/);
  const huge = '9'.repeat(60);
  assert.match(rejected(Array(5).fill(huge).join('*')), /too large/);
  assert.match(rejected('1/' + Array(5).fill(huge).join('/')), /too large/);
});

test('small rational operations agree with independently cross-multiplied expectations', () => {
  for (let a = -4; a <= 4; a++) {
    for (let b = 1; b <= 4; b++) {
      for (let c = -4; c <= 4; c++) {
        for (let d = 1; d <= 4; d++) {
          const results = [
            [`(${a}/${b})+(${c}/${d})`, BigInt(a * d + c * b), BigInt(b * d)],
            [`(${a}/${b})-(${c}/${d})`, BigInt(a * d - c * b), BigInt(b * d)],
            [`(${a}/${b})*(${c}/${d})`, BigInt(a * c), BigInt(b * d)],
            ...(c === 0 ? [] : [[`(${a}/${b})/(${c}/${d})`, BigInt(a * d), BigInt(b * c)]]),
          ] as Array<[string, bigint, bigint]>;
          for (const [source, numerator, denominator] of results) {
            const { value } = evaluated(source);
            assert.equal(value.numerator * denominator, numerator * value.denominator, source);
            assert.ok(value.denominator > 0n);
          }
        }
      }
    }
  }
});

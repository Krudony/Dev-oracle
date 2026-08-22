import type { LevelPreset } from '../engine/types.ts';


export const LEVEL_PRESETS: LevelPreset[] = [
  // --- LEVEL 1: Single Outer Step (Linear Warmup) ---
  {
    id: 'preset_1_1',
    level: 1,
    title: 'Linear Warmup: Addition',
    description: 'Peel the addition first, then the coefficient.',
    equationStr: '3x + 5 = 20',
    targetVariable: 'x',
    solution: { n: 5, d: 1 },
    hints: ['First peel away the +5 with subtraction!', 'Then divide both sides by 3.']
  },
  {
    id: 'preset_1_2',
    level: 1,
    title: 'Linear Warmup: Subtraction',
    description: 'Undo the minus 7 before peeling the multiplier 4.',
    equationStr: '4x - 7 = 25',
    targetVariable: 'x',
    solution: { n: 8, d: 1 },
    hints: ['Undo -7 by adding 7 to the right side.', 'Next, divide 32 by 4.']
  },
  {
    id: 'preset_1_3',
    level: 1,
    title: 'Simple Group Factor',
    description: 'Divide by the outer coefficient 2 before unpacking the brackets.',
    equationStr: '2(y + 6) = 22',
    targetVariable: 'y',
    solution: { n: 5, d: 1 },
    hints: ['Clear the outer multiplier 2 first using division (÷).', 'Then subtract 6 from 11.']
  },
  {
    id: 'preset_1_4',
    level: 1,
    title: 'Variable Isolation: n',
    description: 'Solve for n with basic two-step reverse PEMDAS.',
    equationStr: '5n - 12 = 18',
    targetVariable: 'n',
    solution: { n: 6, d: 1 },
    hints: ['Peel -12 by adding 12 to 18 to get 30.', 'Divide 30 by 5 to isolate n.']
  },
  {
    id: 'preset_1_5',
    level: 1,
    title: 'Balanced Linear Equation',
    description: 'Undo +9 and peel coefficient 6.',
    equationStr: '6x + 9 = 45',
    targetVariable: 'x',
    solution: { n: 6, d: 1 },
    hints: ['Subtract 9 from 45 to get 36.', 'Divide 36 by 6.']
  },

  // --- LEVEL 2: Fractions & Multipliers ---
  {
    id: 'preset_2_1',
    level: 2,
    title: 'Fraction Bar Denominator',
    description: 'Clear the bottom denominator 3 before touching the numerator.',
    equationStr: '(2x - 4) / 3 = 6',
    targetVariable: 'x',
    solution: { n: 11, d: 1 },
    hints: ['Multiply both sides by 3 to remove the fraction bar!', 'Next, add 4 to 18, then divide by 2.']
  },
  {
    id: 'preset_2_2',
    level: 2,
    title: 'Numerator Trapper',
    description: 'Multiply by denominator 4 to free 3m + 9.',
    equationStr: '(3m + 9) / 4 = 6',
    targetVariable: 'm',
    solution: { n: 5, d: 1 },
    hints: ['Clear denominator 4 with multiplication (× 4).', 'Then subtract 9 and divide by 3.']
  },
  {
    id: 'preset_2_3',
    level: 2,
    title: 'Fraction with Outer Multiplier',
    description: 'Unpack the fraction bar and outer factor 5.',
    equationStr: '5(x - 2) / 2 = 10',
    targetVariable: 'x',
    solution: { n: 6, d: 1 },
    hints: ['Multiply by denominator 2 to get 20.', 'Divide by 5 to get 4, then add 2.']
  },
  {
    id: 'preset_2_4',
    level: 2,
    title: 'Clean Fractional Reduction',
    description: 'Multiply by 6, subtract 8, and divide by 4.',
    equationStr: '(4y + 8) / 6 = 4',
    targetVariable: 'y',
    solution: { n: 4, d: 1 },
    hints: ['Multiply by 6 to get 24.', 'Subtract 8 to get 16, then divide by 4.']
  },
  {
    id: 'preset_2_5',
    level: 2,
    title: 'Numerator Subtraction',
    description: 'Isolate 5x - 5 by multiplying by 4.',
    equationStr: '(5x - 5) / 4 = 10',
    targetVariable: 'x',
    solution: { n: 9, d: 1 },
    hints: ['Multiply by 4 to get 40.', 'Add 5 to get 45, then divide by 5.']
  },

  // --- LEVEL 3: Nested Parentheses & Reducible Fractions ---
  {
    id: 'preset_3_1',
    level: 3,
    title: 'The Canonical Stacked Fraction',
    description: 'Clear denominator, peel multiplier 13, and simplify 78/9.',
    equationStr: '13(3m - 7) / 3 = 78 / 9',
    targetVariable: 'm',
    solution: { n: 3, d: 1 },
    hints: [
      'Pro tip: You can simplify 78/9 to 26/3 first!',
      'Multiply by denominator 3 to cancel the fraction.',
      'Divide by 13, then add 7 and divide by 3.'
    ]
  },
  {
    id: 'preset_3_2',
    level: 3,
    title: 'Group Multiplier Fraction',
    description: 'Multiply by 3, divide by 5, then solve 2x + 1.',
    equationStr: '5(2x + 1) / 3 = 15',
    targetVariable: 'x',
    solution: { n: 4, d: 1 },
    hints: ['Multiply by 3 to get 45.', 'Divide by 5 to get 9, then subtract 1 and divide by 2.']
  },
  {
    id: 'preset_3_3',
    level: 3,
    title: 'Combined Fraction & Constant',
    description: 'Subtract 3 first, then clear fraction bar 5.',
    equationStr: '2(4k - 2) / 5 + 3 = 7',
    targetVariable: 'k',
    solution: { n: 3, d: 1 },
    hints: ['Peel the outer +3 first by subtracting 3!', 'Then multiply by denominator 5.']
  },
  {
    id: 'preset_3_4',
    level: 3,
    title: 'Even Scaled Fraction',
    description: 'Clear denominator 2 and multiplier 4.',
    equationStr: '4(3x + 2) / 2 = 28',
    targetVariable: 'x',
    solution: { n: 4, d: 1 },
    hints: ['Multiply by 2 to get 56.', 'Divide by 4 to get 14, then subtract 2 and divide by 3.']
  },
  {
    id: 'preset_3_5',
    level: 3,
    title: 'Rational Target Solution',
    description: 'Peel layers leading to a clean rational solution 9/2.',
    equationStr: '7(2p - 3) / 4 = 21 / 2',
    targetVariable: 'p',
    solution: { n: 9, d: 2 },
    hints: ['Multiply by 4 to get 42.', 'Divide by 7 to get 6, then add 3 to get 2p = 9.']
  },

  // --- LEVEL 4: Double Grouping {} and () ---
  {
    id: 'preset_4_1',
    level: 4,
    title: 'Curly Brace Unpacker',
    description: 'Peel outer multiplier 3, subtract 4, then divide by 2.',
    equationStr: '3{4 + 2(3x - 5)} = 48',
    targetVariable: 'x',
    solution: { n: 11, d: 3 },
    hints: [
      'Divide by outer multiplier 3 first to get 16!',
      'Subtract 4 to get 12.',
      'Divide by 2 to get 6, then add 5 to get 11.'
    ]
  },
  {
    id: 'preset_4_2',
    level: 4,
    title: 'Two-Tiered Onion',
    description: 'Unpack curly braces {} and inner parentheses ().',
    equationStr: '2{5 + 3(2m + 1)} = 46',
    targetVariable: 'm',
    solution: { n: 5, d: 2 },
    hints: ['Divide by 2 to get 23.', 'Subtract 5 to get 18, then divide by 3 to get 6.']
  },
  {
    id: 'preset_4_3',
    level: 4,
    title: 'Nested Grouping with Fraction',
    description: 'Two-layer grouping enclosing a fraction.',
    equationStr: '4{2 + (4x - 6) / 2} = 24',
    targetVariable: 'x',
    solution: { n: 7, d: 2 },
    hints: ['Divide by 4 to get 6.', 'Subtract 2 to get 4, then multiply by 2 to get 8.']
  },
  {
    id: 'preset_4_4',
    level: 4,
    title: 'Subtracted Group Layer',
    description: 'Divide by 5, add 4, then divide by 3.',
    equationStr: '5{3(2y - 1) - 4} = 55',
    targetVariable: 'y',
    solution: { n: 3, d: 1 },
    hints: ['Divide by 5 to get 11.', 'Add 4 to get 15, then divide by 3 to get 5.']
  },
  {
    id: 'preset_4_5',
    level: 4,
    title: 'Double Group Integer Solution',
    description: 'Solve 2{8 + 2(5n - 3)} = 44.',
    equationStr: '2{8 + 2(5n - 3)} = 44',
    targetVariable: 'n',
    solution: { n: 2, d: 1 },
    hints: ['Divide by 2 to get 22.', 'Subtract 8 to get 14, then divide by 2 to get 7.']
  },

  // --- LEVEL 5: Master Onion [] {} () ---
  {
    id: 'preset_5_1',
    level: 5,
    title: 'Master Onion (Clean Integer x = 3)',
    description: 'Three tiers of brackets: square [ ], curly { }, and round ( ).',
    equationStr: '2[2 + 2{2 + (2x - 1)}] = 32',
    targetVariable: 'x',
    solution: { n: 3, d: 1 },
    hints: [
      'Peel outer multiplier 2 -> RHS = 16',
      'Peel outer +2 -> RHS = 14',
      'Peel multiplier 2 -> RHS = 7',
      'Peel +2 -> RHS = 5',
      'Peel -1 -> RHS = 6',
      'Peel 2 -> x = 3!'
    ]
  },
  {
    id: 'preset_5_2',
    level: 5,
    title: 'Master Onion (Canonical x = 7/2)',
    description: 'The famous prompt equation with triple bracket nesting.',
    equationStr: '2[2 + 2{2 + (2x - 1)}] = 36',
    targetVariable: 'x',
    solution: { n: 7, d: 2 },
    hints: [
      'Peel outer multiplier 2 -> RHS = 18',
      'Peel outer +2 -> RHS = 16',
      'Peel multiplier 2 -> RHS = 8',
      'Peel +2 -> RHS = 6',
      'Peel -1 -> RHS = 7',
      'Divide by 2 -> x = 7/2!'
    ]
  },
  {
    id: 'preset_5_3',
    level: 5,
    title: 'Triple Nesting: Variable m',
    description: 'Peel square brackets, curly braces, and parentheses.',
    equationStr: '3[4 + 2{3 + 2(2m + 1)}] = 66',
    targetVariable: 'm',
    solution: { n: 1, d: 1 },
    hints: [
      'Divide by 3 -> 22',
      'Subtract 4 -> 18, divide by 2 -> 9',
      'Subtract 3 -> 6, divide by 2 -> 3',
      'Subtract 1 -> 2, divide by 2 -> m = 1!'
    ]
  },
  {
    id: 'preset_5_4',
    level: 5,
    title: 'Master Onion with Internal Fraction',
    description: 'Triple brackets wrapping a vertical fraction.',
    equationStr: '4[1 + {5 + (3x - 1) / 2}] = 40',
    targetVariable: 'x',
    solution: { n: 3, d: 1 },
    hints: [
      'Divide by 4 -> 10',
      'Subtract 1 -> 9, subtract 5 -> 4',
      'Multiply by 2 -> 8, add 1 -> 9, divide by 3 -> x = 3!'
    ]
  },
  {
    id: 'preset_5_5',
    level: 5,
    title: 'Grand Master Algebra Onion',
    description: 'Full reverse PEMDAS challenge with 3 bracket tiers.',
    equationStr: '2[3 + 3{1 + 2(4y - 3)}] = 48',
    targetVariable: 'y',
    solution: { n: 3, d: 2 },
    hints: [
      'Divide by 2 -> 24',
      'Subtract 3 -> 21, divide by 3 -> 7',
      'Subtract 1 -> 6, divide by 2 -> 3',
      'Add 3 -> 6, divide by 4 -> y = 6/4 = 3/2!'
    ]
  }
];

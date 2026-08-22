import type { DifficultyProfile } from '../engine/types.ts';


export const DIFFICULTY_PROFILES: Record<number, DifficultyProfile> = {
  1: {
    level: 1,
    name: 'Novice Peeler',
    description: 'Single outer addition/subtraction and linear multipliers (e.g. 3x + 5 = 20)',
    maxPeelingDepth: 2,
    allowedBracketTiers: ['round'],
    allowFractions: false,
    allowReducibleRHS: false,
    variablePool: ['x', 'y', 'n', 'a'],
    coeffRange: [2, 6],
    divisorRange: [2, 4],
    solutionRange: [2, 10]
  },
  2: {
    level: 2,
    name: 'Fraction Trapper',
    description: 'Single vertical fractions and multi-term numerators (e.g. (2x - 4)/3 = 6)',
    maxPeelingDepth: 3,
    allowedBracketTiers: ['round'],
    allowFractions: true,
    allowReducibleRHS: false,
    variablePool: ['x', 'y', 'm', 'a'],
    coeffRange: [2, 6],
    divisorRange: [2, 5],
    solutionRange: [3, 12]
  },
  3: {
    level: 3,
    name: 'Multiplier Stacker',
    description: 'Nested () multipliers, stacked fractions & reducible RHS (e.g. 13(3m-7)/3 = 78/9)',
    maxPeelingDepth: 4,
    allowedBracketTiers: ['round'],
    allowFractions: true,
    allowReducibleRHS: true,
    variablePool: ['m', 'x', 'k', 'p'],
    coeffRange: [2, 13],
    divisorRange: [2, 9],
    solutionRange: [2, 8]
  },
  4: {
    level: 4,
    name: 'Double Grouping',
    description: 'Two-tier nested grouping with curly braces {} and round brackets () (e.g. 3{4 + 2(3x - 5)} = 48)',
    maxPeelingDepth: 5,
    allowedBracketTiers: ['round', 'curly'],
    allowFractions: true,
    allowReducibleRHS: true,
    variablePool: ['x', 'm', 'y', 'z'],
    coeffRange: [2, 8],
    divisorRange: [2, 6],
    solutionRange: [2, 6]
  },
  5: {
    level: 5,
    name: 'Master Onion',
    description: 'Three-tier nested grouping [ ] { } ( ) with arbitrary depth (e.g. 2[2 + 2{2 + (2x-1)}] = 36)',
    maxPeelingDepth: 6,
    allowedBracketTiers: ['round', 'curly', 'square'],
    allowFractions: true,
    allowReducibleRHS: true,
    variablePool: ['x', 'm', 'n', 'y'],
    coeffRange: [2, 6],
    divisorRange: [2, 6],
    solutionRange: [2, 5]
  }
};

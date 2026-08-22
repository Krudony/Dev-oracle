import { describe, it, expect } from 'vitest';
import { equationGenerator } from '../../src/generator/generator';
import { solveEquation } from '../../src/engine/solver';

describe('Tier 4: Monte Carlo Solvability Fuzzer', () => {
  it('fuzzes 100 random equations per difficulty level and verifies 100% solvability', () => {
    const NUM_ITERATIONS = 100;
    let totalTested = 0;
    
    for (let lvl = 1; lvl <= 5; lvl++) {
      for (let i = 0; i < NUM_ITERATIONS; i++) {
        const eq = equationGenerator.generate({ level: lvl });
        
        expect(eq).toBeDefined();
        expect(eq.targetVariable).toBeTruthy();

        const proof = solveEquation(eq);
        
        // Assert equation is solvable
        expect(proof.isSolvable).toBe(true);
        expect(proof.stepsCount).toBeGreaterThan(0);
        
        // Assert the solution engine's verified solution matches the generator's intended solution
        expect(proof.verifiedSolution.equals(eq.solution)).toBe(true);
        
        totalTested++;
      }
    }
    
    // Quick sanity check to make sure the loops executed
    expect(totalTested).toBe(500);
  });
});

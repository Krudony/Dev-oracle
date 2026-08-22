import confetti from 'canvas-confetti';
import { FractionValue } from '../engine/rational';

/**
 * Triggers full-screen celebratory confetti particles.
 */
export function fireCelebrationConfetti(): void {
  try {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 }
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55
    });
    fire(0.2, {
      spread: 60
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45
    });
  } catch {
    // Ignore if running without canvas support
  }
}

/**
 * Formats a rational solution for display.
 */
export function formatSolution(sol: FractionValue): string {
  if (sol.d === 1) return `${sol.n}`;
  return `${sol.n}/${sol.d}`;
}

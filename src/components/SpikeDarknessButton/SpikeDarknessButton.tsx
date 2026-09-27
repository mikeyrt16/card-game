import type { CSSProperties } from 'react';
import { characterGlowRgb } from '../../data/characterColors';
import styles from './SpikeDarknessButton.module.css';

interface SpikeDarknessButtonProps {
  /** How many Spike has left to place, counted down in the label. Always at
   *  least 1 — the caller stops rendering the button once they're spent
   *  rather than leaving a dead "(0)" on screen. */
  remaining: number;
  onAddDarkness: () => void;
}

/** Spike's special component: puts another shadow token on the map. Unlike
 *  Alice's coin this is a control rather than a piece, so it's only ever
 *  drawn for Spike's own player — what it creates is the shared part, and
 *  that lives on the board. */
export function SpikeDarknessButton({ remaining, onAddDarkness }: SpikeDarknessButtonProps) {
  return (
    <button
      type="button"
      className={styles.button}
      style={{ '--glow-rgb': characterGlowRgb('spike') } as CSSProperties}
      onClick={onAddDarkness}
    >
      Shadow Token ({remaining})
    </button>
  );
}

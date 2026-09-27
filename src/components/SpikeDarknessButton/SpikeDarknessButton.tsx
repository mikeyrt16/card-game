import type { CSSProperties } from 'react';
import { characterGlowRgb } from '../../data/characterColors';
import styles from './SpikeDarknessButton.module.css';

interface SpikeDarknessButtonProps {
  onAddDarkness: () => void;
}

/** Spike's special component: puts another patch of darkness on the map.
 *  Unlike Alice's coin this is a control rather than a piece, so it's only
 *  ever drawn for Spike's own player — what it creates is the shared part,
 *  and that lives on the board. */
export function SpikeDarknessButton({ onAddDarkness }: SpikeDarknessButtonProps) {
  return (
    <button
      type="button"
      className={styles.button}
      style={{ '--glow-rgb': characterGlowRgb('spike') } as CSSProperties}
      onClick={onAddDarkness}
    >
      Add darkness
    </button>
  );
}

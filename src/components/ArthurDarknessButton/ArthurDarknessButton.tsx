import type { CSSProperties } from 'react';
import { characterGlowRgb } from '../../data/characterColors';
import styles from './ArthurDarknessButton.module.css';

interface ArthurDarknessButtonProps {
  onAddDarkness: () => void;
}

/** Arthur's special component: puts another patch of darkness on the map.
 *  Unlike Alice's coin this is a control rather than a piece, so it's only
 *  ever drawn for Arthur's own player — what it creates is the shared part,
 *  and that lives on the board. */
export function ArthurDarknessButton({ onAddDarkness }: ArthurDarknessButtonProps) {
  return (
    <button
      type="button"
      className={styles.button}
      style={{ '--glow-rgb': characterGlowRgb('arthur') } as CSSProperties}
      onClick={onAddDarkness}
    >
      Add darkness
    </button>
  );
}

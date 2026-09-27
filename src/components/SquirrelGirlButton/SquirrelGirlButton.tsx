import type { CSSProperties } from 'react';
import { characterGlowRgb } from '../../data/characterColors';
import styles from './SquirrelGirlButton.module.css';

interface SquirrelGirlButtonProps {
  /** How many Squirrel Girl has left to spawn, counted down in the label.
   *  Always at least 1 — the caller stops rendering the button once they're
   *  spent rather than leaving a dead "(0)" on screen. */
  remaining: number;
  onSpawnMinion: () => void;
}

/** Squirrel Girl's special component: adds one more squirrel minion coin.
 *  Unlike Spike's and Willow's own buttons in the same spot, this one doesn't
 *  disappear on its own once used — it counts down and disappears only once
 *  all SQUIRREL_GIRL_MINION_LIMIT are spawned (see the caller). A control
 *  rather than a piece, so it's only ever drawn for Squirrel Girl's own
 *  player — what it creates is the shared part, and that lives on the board. */
export function SquirrelGirlButton({ remaining, onSpawnMinion }: SquirrelGirlButtonProps) {
  return (
    <button
      type="button"
      className={styles.button}
      style={{ '--glow-rgb': characterGlowRgb('squirrelGirl') } as CSSProperties}
      onClick={onSpawnMinion}
    >
      Squirrel ({remaining})
    </button>
  );
}

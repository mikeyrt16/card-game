import type { CSSProperties } from 'react';
import { characterGlowRgb } from '../../data/characterColors';
import styles from './WillowResurrectButton.module.css';

interface WillowResurrectButtonProps {
  onResurrect: () => void;
}

/** Willow's special component: brings her fallen minion back. A control rather
 *  than a piece, so — like Spike's shadow-token button, which it sits in the
 *  same place as — it's only ever drawn for Willow's own player, and only
 *  while the minion is actually dead. */
export function WillowResurrectButton({ onResurrect }: WillowResurrectButtonProps) {
  return (
    <button
      type="button"
      className={styles.button}
      style={{ '--glow-rgb': characterGlowRgb('willow') } as CSSProperties}
      onClick={onResurrect}
    >
      Resurrect
    </button>
  );
}

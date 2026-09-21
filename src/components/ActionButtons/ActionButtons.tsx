import type { CSSProperties } from 'react';
import { getActionButtonImage } from '../../data/assets';
import { characterGlowRgb } from '../../data/characterColors';
import styles from './ActionButtons.module.css';

const SINGLE_IMAGE = getActionButtonImage('single');
const DOUBLE_IMAGE = getActionButtonImage('double');

interface ActionButtonsProps {
  /** Whose color the hover glow matches — the local player's own chosen
   *  character, same source color as their coins' particle fountain. */
  characterId: string | null;
  /** True while *either* player has a serve mode running — both buttons go
   *  half-opacity and inert on both screens until it ends. */
  disabled: boolean;
  onSingle: () => void;
  onDouble: () => void;
}

/** The two card-serve buttons, bottom-right of the board. */
export function ActionButtons({ characterId, disabled, onSingle, onDouble }: ActionButtonsProps) {
  return (
    <div className={styles.container} style={{ '--glow-rgb': characterGlowRgb(characterId) } as CSSProperties}>
      <button type="button" className={styles.button} onClick={onSingle} disabled={disabled} aria-label="Single">
        <img src={SINGLE_IMAGE} alt="" className={styles.icon} draggable={false} />
      </button>
      <button type="button" className={styles.button} onClick={onDouble} disabled={disabled} aria-label="Double">
        <img src={DOUBLE_IMAGE} alt="" className={styles.icon} draggable={false} />
      </button>
    </div>
  );
}

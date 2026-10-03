import type { CSSProperties } from 'react';
import { characterGlowRgb } from '../../data/characterColors';
import styles from './CharacterActionButton.module.css';

interface CharacterActionButtonProps {
  /** Whose control this is — only used to glow in their colour on hover. */
  characterId: string;
  /** What it reads, counts and all (e.g. "Add archer (x2)"). Worked out by the
   *  caller, which is the side that knows what's left to spend. */
  label: string;
  onClick: () => void;
}

/** The one control a character gets, docked above their own draw pile: Spike's
 *  shadow tokens, Willow's resurrect, Squirrel Girl's squirrels, Yennenga's
 *  archers. A control rather than a piece, so it's only ever drawn for that
 *  character's own player — what it creates or changes is the shared part, and
 *  that lives on the board.
 *
 *  Deliberately knows nothing about any particular ability: whether it should
 *  be on screen at all, and what it says, are the caller's to decide (see
 *  GameRoute), which is what lets all four share one button. */
export function CharacterActionButton({ characterId, label, onClick }: CharacterActionButtonProps) {
  return (
    <button
      type="button"
      className={styles.button}
      style={{ '--glow-rgb': characterGlowRgb(characterId) } as CSSProperties}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

import cursorImage from '../../assets/cursor.png';
import type { CursorPosition } from '../../shared/protocol';
import styles from './OpponentCursor.module.css';

interface OpponentCursorProps {
  /** Where the opponent's mouse is, as a percentage of *their* viewport. */
  position: CursorPosition;
}

/** The opponent's mouse, mirrored through both axes — they're sitting across
 *  the board from us, so their top-left reads as our bottom-right. Working
 *  in percentages rather than pixels means it lands in the matching spot
 *  even though the two windows are different sizes. */
export function OpponentCursor({ position }: OpponentCursorProps) {
  return (
    <img
      src={cursorImage}
      alt=""
      className={styles.cursor}
      draggable={false}
      style={{ left: `${100 - position.x}%`, top: `${100 - position.y}%` }}
    />
  );
}

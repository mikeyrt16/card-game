import type { DraggedCardView } from '../../shared/protocol';
import styles from './OpponentDraggedCard.module.css';

interface OpponentDraggedCardProps {
  position: DraggedCardView;
  /** Already resolved by the caller: the card's own art when the server let
   *  us see what it is, otherwise the opponent's card back. */
  image: string;
}

/** The card the opponent is holding, mirrored through both axes exactly
 *  like their cursor — they're sitting across the board from us — so it
 *  stays under their pointer as we see it. */
export function OpponentDraggedCard({ position, image }: OpponentDraggedCardProps) {
  return (
    <img
      src={image}
      alt=""
      className={styles.card}
      draggable={false}
      style={{ left: `${100 - position.x}%`, top: `${100 - position.y}%` }}
    />
  );
}

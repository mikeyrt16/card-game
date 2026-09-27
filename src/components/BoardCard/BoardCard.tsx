import type { DragEvent } from 'react';
import { hideNativeDragImage } from '../DragPreview/hideNativeDragImage';
import styles from './BoardCard.module.css';

interface BoardCardProps {
  id: string;
  /** Screen position of the card's centre, already converted out of the
   *  shared map coordinates by the caller. */
  left: number;
  top: number;
  faceUp: boolean;
  /** The owner's card back — what everyone sees while it's face down. */
  backImage: string;
  /** The card's own art. Null for an opponent's face-down card, whose
   *  identity the server withholds entirely. */
  frontImage: string | null;
  /** Only the player who put the card down may turn it over. */
  canFlip: boolean;
  /** Likewise, only they can move it — the other player's cards are theirs
   *  to look at, not to rearrange. */
  canDrag: boolean;
  /** Hides this card while the drag preview is standing in for it, so the
   *  two aren't on screen at once. */
  isDragging: boolean;
  onFlip: () => void;
  /** `centreOffset` is the vector from the pointer to the card's centre at
   *  the moment it was grabbed. */
  onDragStart: (centreOffset: { x: number; y: number }) => void;
  /** Fires repeatedly once the drag is actually under way — which is the
   *  earliest safe moment to hide this card. See the note on the handler. */
  onDrag: () => void;
  onDragEnd: () => void;
}

/** A card lying on the map. Turns over with a double-click from whoever put
 *  it there, and can be picked up again — dropped somewhere else on the
 *  board, or onto any of the normal piles. */
export function BoardCard({
  id,
  left,
  top,
  faceUp,
  backImage,
  frontImage,
  canFlip,
  canDrag,
  isDragging,
  onFlip,
  onDragStart,
  onDrag,
  onDragEnd,
}: BoardCardProps) {
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    hideNativeDragImage(e.dataTransfer);
    // Measuring where the card sits relative to the pointer *now* is what
    // lets the spot the player actually grabbed stay pinned under their
    // cursor — and what stops the card jumping on release, since the drop
    // applies the same offset.
    const rect = e.currentTarget.getBoundingClientRect();
    onDragStart({
      x: rect.left + rect.width / 2 - e.clientX,
      y: rect.top + rect.height / 2 - e.clientY,
    });
  };

  return (
    <div
      className={[styles.card, isDragging && styles.dragging, !canDrag && styles.fixed]
        .filter(Boolean)
        .join(' ')}
      style={{ left: `${left}px`, top: `${top}px` }}
      draggable={canDrag}
      onDragStart={handleDragStart}
      // Hiding this card is deliberately left until `drag` rather than done
      // in `dragStart` above: restyling the drag source during dragstart
      // silently aborts the whole native drag (no preview, no drop at all).
      // `drag` only fires once the gesture is genuinely under way, so by
      // then it's safe. The card must also stay mounted throughout — an
      // element removed mid-drag never fires its own dragend.
      onDrag={onDrag}
      onDragEnd={onDragEnd}
      onDoubleClick={canFlip ? onFlip : undefined}
      role="img"
      aria-label={faceUp ? 'Face-up card on the board' : 'Face-down card on the board'}
    >
      <div className={faceUp ? `${styles.inner} ${styles.flipped}` : styles.inner}>
        <img src={backImage} alt="" className={`${styles.face} ${styles.faceDown}`} draggable={false} />
        {/* Absent until the server tells us what the card is, which for an
            opponent's card is the moment they turn it over. */}
        {frontImage && (
          <img src={frontImage} alt="" className={`${styles.face} ${styles.faceUp}`} draggable={false} />
        )}
      </div>
    </div>
  );
}

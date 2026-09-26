import { useEffect, useState } from 'react';
import type { CardData } from '../../data/cards';
import styles from './DragPreview.module.css';

interface DragPreviewProps {
  card: CardData;
  /** For a card picked up off the board: the vector from the pointer to
   *  where the card's centre should sit, which keeps the exact spot that
   *  was grabbed under the cursor. Null for cards dragged out of a hand or
   *  pile, which hang from a fixed point below the cursor instead — those
   *  are drawn from a small, rotated fan, so there's no meaningful grab
   *  point to preserve. */
  centreOffset: { x: number; y: number } | null;
}

/** The card being dragged, as a real element that follows the pointer.
 *  Replaces the browser's native drag image, which is a flat bitmap taken
 *  once at dragstart and can't be restyled or animated for the rest of the
 *  gesture — the drag sources hand that one a transparent pixel (see
 *  hideNativeDragImage) so only this is visible. */
export function DragPreview({ card, centreOffset }: DragPreviewProps) {
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const track = (e: DragEvent) => {
      // Browsers report (0, 0) on some drag events, notably the last of a
      // gesture; snapping the card to the screen corner for a frame reads
      // as a glitch, so those are ignored.
      if (e.clientX === 0 && e.clientY === 0) {
        return;
      }
      setPoint({ x: e.clientX, y: e.clientY });
    };
    // `mousemove` is silent for the whole of a native drag — `dragover` is
    // what keeps firing wherever the pointer goes. `dragstart` seeds the
    // first position so the card appears under the cursor immediately
    // rather than only once it has moved. Capture phase, so neither can be
    // stopped by a handler on the way up.
    document.addEventListener('dragstart', track, true);
    document.addEventListener('dragover', track, true);
    return () => {
      document.removeEventListener('dragstart', track, true);
      document.removeEventListener('dragover', track, true);
    };
  }, []);

  if (!point) {
    return null;
  }

  // Centring on the grabbed offset overrides the stylesheet's default
  // "hang below the cursor" anchor.
  const placement = centreOffset
    ? {
        left: `${point.x + centreOffset.x}px`,
        top: `${point.y + centreOffset.y}px`,
        transform: 'translate(-50%, -50%)',
      }
    : { left: `${point.x}px`, top: `${point.y}px` };

  return (
    <div className={styles.preview} style={placement}>
      <img src={card.image} alt="" className={styles.image} draggable={false} />
    </div>
  );
}

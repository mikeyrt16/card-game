/** Must match --dragged-card-width in index.css. */
const CARD_WIDTH_PX = 240;
const CARD_HEIGHT_PX = (CARD_WIDTH_PX * 349) / 250;
/** How far below the pointer a card out of a hand or pile hangs, so it
 *  doesn't bury whatever is being hovered. */
const TOP_ANCHOR_PX = 16;

/** Where the centre of the dragged card sits for a given pointer position.
 *  The one definition of it: the preview draws itself from this, and a drop
 *  onto the board places the card from it, so a card can't land anywhere
 *  other than where it appeared to be.
 *
 *  `centreOffset` is set for a card lifted off the board, which is held at
 *  the exact point it was grabbed. Without one the card hangs from a fixed
 *  point below the pointer instead — which is why its centre is well below
 *  the cursor, not on it. */
export function draggedCardCentre(
  point: { x: number; y: number },
  centreOffset: { x: number; y: number } | null,
): { x: number; y: number } {
  if (centreOffset) {
    return { x: point.x + centreOffset.x, y: point.y + centreOffset.y };
  }
  return { x: point.x, y: point.y - TOP_ANCHOR_PX + CARD_HEIGHT_PX / 2 };
}

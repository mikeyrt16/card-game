import { useEffect, useRef, useState, type CSSProperties } from 'react';
import styles from './CardPile.module.css';

interface CardPileProps {
  count: number;
  image: string;
  ariaLabel: string;
  placement: 'draw' | 'discard' | 'opponent-draw' | 'opponent-discard';
  onClick: () => void;
  /** Blocks the click-to-draw button only — a separate PileDropZone handles
   *  drag-and-drop onto this pile and isn't affected by this. */
  disabled?: boolean;
  /** When either is provided, hovering the pile for a beat reveals a small
   *  menu above it with just the button(s) whose handler was given — e.g.
   *  View alone for a read-only look at someone else's pile. */
  onView?: () => void;
  onShuffle?: () => void;
}

const CARD_WIDTH_PX = 110;
const MAX_PILE_WIDTH_PX = 1000;
const BASE_LAYER_OFFSET_PX = 0.5;
const HOVER_HOLD_MS = 400;

export function CardPile({
  count,
  image,
  ariaLabel,
  placement,
  onClick,
  disabled = false,
  onView,
  onShuffle,
}: CardPileProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const hoverTimerRef = useRef<number | null>(null);

  const clearHoverTimer = () => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  useEffect(() => clearHoverTimer, []);

  if (count <= 0) {
    return null;
  }

  const hasMenu = Boolean(onView || onShuffle);

  const layerOffset =
    count > 1
      ? Math.min(BASE_LAYER_OFFSET_PX, (MAX_PILE_WIDTH_PX - CARD_WIDTH_PX) / (count - 1))
      : BASE_LAYER_OFFSET_PX;

  const placementClass = {
    draw: styles.placementDraw,
    discard: styles.placementDiscard,
    'opponent-draw': styles.placementOpponentDraw,
    'opponent-discard': styles.placementOpponentDiscard,
  }[placement];
  // Opponent piles sit near the top of the screen, so their hover menu
  // needs to open downward instead of the default upward (see .menuBelow).
  const opensBelow = placement === 'opponent-draw' || placement === 'opponent-discard';

  return (
    <div
      className={`${styles.pile} ${placementClass}${disabled ? ` ${styles.disabled}` : ''}`}
      onMouseEnter={
        hasMenu
          ? () => {
              clearHoverTimer();
              hoverTimerRef.current = window.setTimeout(() => setIsMenuOpen(true), HOVER_HOLD_MS);
            }
          : undefined
      }
      onMouseLeave={
        hasMenu
          ? () => {
              clearHoverTimer();
              setIsMenuOpen(false);
            }
          : undefined
      }
    >
      {hasMenu && isMenuOpen && (
        <>
          {/* Fills the gap between the pile and the menu so the pointer
              stays within this element's subtree the whole way there —
              otherwise it crosses empty space and mouseleave fires first. */}
          <div className={opensBelow ? `${styles.bridge} ${styles.bridgeBelow}` : styles.bridge} />
          <div className={opensBelow ? `${styles.menu} ${styles.menuBelow}` : styles.menu}>
            {onView && (
              <button
                type="button"
                className={styles.menuButton}
                onClick={() => {
                  setIsMenuOpen(false);
                  onView();
                }}
              >
                View
              </button>
            )}
            {onShuffle && (
              <button
                type="button"
                className={styles.menuButton}
                onClick={() => {
                  setIsMenuOpen(false);
                  onShuffle();
                }}
              >
                Shuffle
              </button>
            )}
          </div>
        </>
      )}
      <button
        type="button"
        className={styles.stackButton}
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        style={{ '--layer-offset': `${layerOffset}px` } as CSSProperties}
      >
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className={styles.layer} style={{ '--i': i } as CSSProperties}>
            <img src={image} alt="" className={styles.layerImage} draggable={false} />
          </div>
        ))}
      </button>
    </div>
  );
}

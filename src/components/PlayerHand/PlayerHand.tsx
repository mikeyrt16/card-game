import { Fragment, useState, type CSSProperties } from 'react';
import type { CardData } from '../../data/cards';
import styles from './PlayerHand.module.css';

interface PlayerHandProps {
  cards: CardData[];
  onCardDragStart?: () => void;
  onCardDragEnd?: () => void;
  onReorder?: (reordered: CardData[]) => void;
}

const MAX_ROTATION_DEG = 7;
const MAX_ARC_RISE_PX = 30;
const CARD_WIDTH_PX = 160;
const CARD_ASPECT_RATIO = 349 / 250;
const MAX_HAND_WIDTH_PX = 1000;
const BASE_CARD_SPACING_PX = 68;
const DRAG_PREVIEW_SCALE = 1.5;

export function PlayerHand({ cards, onCardDragStart, onCardDragEnd, onReorder }: PlayerHandProps) {
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const center = (cards.length - 1) / 2;
  const cardSpacing =
    cards.length > 1
      ? Math.min(BASE_CARD_SPACING_PX, (MAX_HAND_WIDTH_PX - CARD_WIDTH_PX) / (cards.length - 1))
      : BASE_CARD_SPACING_PX;

  return (
    <div className={styles.hand}>
      {cards.map((card, i) => {
        const offset = i - center;
        const normalized = center > 0 ? offset / center : 0;
        const isFocused = focusedCardId === card.id;

        const positionStyle = {
          '--rotate': `${normalized * MAX_ROTATION_DEG}deg`,
          '--translate-x': `${offset * cardSpacing}px`,
          '--translate-y': `${normalized * normalized * MAX_ARC_RISE_PX}px`,
        } as CSSProperties;

        return (
          <Fragment key={card.id}>
            <div
              className={styles.slot}
              style={{ ...positionStyle, zIndex: i }}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', card.id);
                e.dataTransfer.effectAllowed = 'move';

                const width = CARD_WIDTH_PX * DRAG_PREVIEW_SCALE;
                const height = width * CARD_ASPECT_RATIO;
                const ghost = document.createElement('img');
                ghost.src = card.image;
                ghost.style.position = 'fixed';
                ghost.style.top = '-9999px';
                ghost.style.left = '-9999px';
                ghost.style.width = `${width}px`;
                ghost.style.height = `${height}px`;
                ghost.style.objectFit = 'cover';
                ghost.style.borderRadius = '12px';
                ghost.style.opacity = '0.35';
                document.body.appendChild(ghost);
                // Anchor the cursor near the top of the ghost (rather than
                // centered) so the ghost trails below the cursor instead of
                // fully covering whatever drop target the cursor is over —
                // native drag images always paint above the page, so this is
                // the only way to keep the target underneath legible.
                e.dataTransfer.setDragImage(ghost, width / 2, 16);
                window.setTimeout(() => ghost.remove(), 0);

                setFocusedCardId(null);
                setDraggedCardId(card.id);
                onCardDragStart?.();
              }}
              onDragEnd={() => {
                setDraggedCardId(null);
                onCardDragEnd?.();
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={() => {
                if (!draggedCardId || draggedCardId === card.id) {
                  return;
                }
                const fromIndex = cards.findIndex((c) => c.id === draggedCardId);
                const toIndex = cards.findIndex((c) => c.id === card.id);
                if (fromIndex === -1 || toIndex === -1) {
                  return;
                }
                const reordered = [...cards];
                const [moved] = reordered.splice(fromIndex, 1);
                reordered.splice(toIndex, 0, moved);
                onReorder?.(reordered);
              }}
              onDrop={(e) => e.preventDefault()}
              onMouseEnter={() => setFocusedCardId(card.id)}
              onMouseLeave={() => setFocusedCardId(null)}
            />
            <div
              data-testid="hand-card"
              className={styles.cardSlot}
              style={{ ...positionStyle, zIndex: isFocused ? cards.length : i }}
            >
              <div className={isFocused ? `${styles.card} ${styles.focused}` : styles.card}>
                <img src={card.image} alt="" className={styles.cardImage} draggable={false} />
              </div>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

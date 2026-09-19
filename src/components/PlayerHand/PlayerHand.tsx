import { Fragment, useState, type CSSProperties } from 'react';
import type { CardData } from '../../data/cards';
import styles from './PlayerHand.module.css';

interface PlayerHandProps {
  cards: CardData[];
}

const MAX_ROTATION_DEG = 7;
const MAX_ARC_RISE_PX = 30;
const CARD_WIDTH_PX = 160;
const MAX_HAND_WIDTH_PX = 1000;
const BASE_CARD_SPACING_PX = 68;

export function PlayerHand({ cards }: PlayerHandProps) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
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
        const isFocused = focusedIndex === i;

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
              onMouseEnter={() => setFocusedIndex(i)}
              onMouseLeave={() => setFocusedIndex(null)}
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

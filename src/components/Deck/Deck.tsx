import type { CSSProperties } from 'react';
import cardBack from '../../assets/card-back/card1.jpeg';
import styles from './Deck.module.css';

interface DeckProps {
  count: number;
  onDraw: () => void;
}

const CARD_WIDTH_PX = 110;
const MAX_DECK_WIDTH_PX = 1000;
const BASE_LAYER_OFFSET_PX = 0.5;

export function Deck({ count, onDraw }: DeckProps) {
  if (count <= 0) {
    return null;
  }

  const layerOffset =
    count > 1
      ? Math.min(BASE_LAYER_OFFSET_PX, (MAX_DECK_WIDTH_PX - CARD_WIDTH_PX) / (count - 1))
      : BASE_LAYER_OFFSET_PX;

  return (
    <div className={styles.deck}>
      <button
        type="button"
        className={styles.stackButton}
        onClick={onDraw}
        aria-label={`Draw a card (${count} remaining)`}
        style={{ '--layer-offset': `${layerOffset}px` } as CSSProperties}
      >
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className={styles.layer} style={{ '--i': i } as CSSProperties}>
            <img src={cardBack} alt="" className={styles.layerImage} draggable={false} />
          </div>
        ))}
      </button>
    </div>
  );
}

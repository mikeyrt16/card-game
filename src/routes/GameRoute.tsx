import { useState } from 'react';
import { Deck } from '../components/Deck/Deck';
import { PlayerHand } from '../components/PlayerHand/PlayerHand';
import { ALL_CARDS, pickRandomCards, type CardData } from '../data/cards';
import styles from './GameRoute.module.css';

const MIN_CARD_COUNT = 1;
const DRAW_PILE_SIZE = 30;

function buildDrawPile(size: number): CardData[] {
  return Array.from({ length: size }, (_, i) => {
    const base = ALL_CARDS[Math.floor(Math.random() * ALL_CARDS.length)];
    return { ...base, id: `${base.id}-draw-${i}` };
  });
}

export function GameRoute() {
  const [deck] = useState(() => pickRandomCards(ALL_CARDS.length));
  const [cardCount, setCardCount] = useState(deck.length);
  const [drawPile, setDrawPile] = useState(() => buildDrawPile(DRAW_PILE_SIZE));
  const [drawnCards, setDrawnCards] = useState<CardData[]>([]);

  const hand = [...deck.slice(0, cardCount), ...drawnCards];

  const handleDraw = () => {
    if (drawPile.length === 0) {
      return;
    }
    const [topCard, ...rest] = drawPile;
    setDrawPile(rest);
    setDrawnCards((cards) => [...cards, topCard]);
  };

  return (
    <div className={styles.board}>
      <PlayerHand cards={hand} />
      <Deck count={drawPile.length} onDraw={handleDraw} />
      <div className={styles.cardCountControls}>
        <button
          type="button"
          className={styles.countButton}
          onClick={() => setCardCount((count) => Math.min(deck.length, count + 1))}
          disabled={cardCount >= deck.length}
          aria-label="Increase card count"
        >
          ▲
        </button>
        <span className={styles.countLabel}>{cardCount}</span>
        <button
          type="button"
          className={styles.countButton}
          onClick={() => setCardCount((count) => Math.max(MIN_CARD_COUNT, count - 1))}
          disabled={cardCount <= MIN_CARD_COUNT}
          aria-label="Decrease card count"
        >
          ▼
        </button>
      </div>
    </div>
  );
}

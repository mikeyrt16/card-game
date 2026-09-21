import { useState } from 'react';
import { PlayerHand } from '../PlayerHand/PlayerHand';
import type { CardData } from '../../data/cards';
import styles from './ServeArea.module.css';

interface ServeAreaProps {
  cards: CardData[];
  /** The card currently being dragged from somewhere else, so the fan can
   *  show a live "it would land here" gap — same as the real hand does. */
  incomingCard?: CardData;
  isDragActive: boolean;
  onServeCard: (cardId: string, index: number) => void;
  onConfirm: () => void;
  onCardDragStart: (card: CardData) => void;
  onCardDragEnd: () => void;
  onReorder: (cards: CardData[]) => void;
}

/** The center of the board while *you* are the one serving: your staged
 *  cards as a fan you can hover, reorder and drag back out of, plus the
 *  confirm button that commits the serve. Only ever rendered for the
 *  activator — their opponent sees nothing here until it's confirmed. */
export function ServeArea({
  cards,
  incomingCard,
  isDragActive,
  onServeCard,
  onConfirm,
  onCardDragStart,
  onCardDragEnd,
  onReorder,
}: ServeAreaProps) {
  const [isOver, setIsOver] = useState(false);
  const isEmpty = cards.length === 0;

  return (
    <>
      {isEmpty && <div className={styles.placeholder}>Serve</div>}
      {/* Catches drops that land in the gaps around the fan (and every drop
          while it's still empty, since a fan of nothing has no hit area of
          its own). Drops onto the fan itself are handled by the fan, which
          can place them exactly where they were aimed. Only takes pointer
          events mid-drag, so it never swallows hovers meant for the cards. */}
      <div
        className={[styles.dropZone, isDragActive && styles.active, isOver && styles.over].filter(Boolean).join(' ')}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={() => setIsOver(true)}
        onDragLeave={() => setIsOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsOver(false);
          const cardId = e.dataTransfer.getData('text/plain');
          if (cardId) {
            onServeCard(cardId, cards.length);
          }
        }}
      />
      <PlayerHand
        cards={cards}
        variant="preview"
        incomingCard={incomingCard}
        onCardDragStart={onCardDragStart}
        onCardDragEnd={onCardDragEnd}
        onReorder={onReorder}
        onExternalDrop={onServeCard}
      />
      <button
        type="button"
        className={styles.confirmButton}
        onClick={onConfirm}
        disabled={isEmpty}
        aria-label="Confirm served cards"
      >
        ✓
      </button>
    </>
  );
}

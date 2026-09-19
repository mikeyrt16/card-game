import { useState } from 'react';
import { Deck } from '../components/Deck/Deck';
import { DrawPileDropZone, type DrawPilePosition } from '../components/DrawPileDropZone/DrawPileDropZone';
import { DropZone } from '../components/DropZone/DropZone';
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
  const [playedCard, setPlayedCard] = useState<CardData | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [handOrder, setHandOrder] = useState<string[]>([]);

  const drawPileIds = new Set(drawPile.map((card) => card.id));
  // A card can move hand -> draw pile -> hand again. Once that's happened,
  // its position should come from `drawnCards` (append-ordered, so the most
  // recent draw lands at the end) rather than its original slot in `deck` —
  // so exclude it from the `deck` portion entirely once it's been drawn.
  const drawnCardIds = new Set(drawnCards.map((card) => card.id));
  const naturalHand = [
    ...deck.slice(0, cardCount).filter((card) => !drawnCardIds.has(card.id)),
    ...drawnCards,
  ].filter((card) => card.id !== playedCard?.id && !drawPileIds.has(card.id));

  // handOrder is a user-arranged preference: keep ids still in the hand (in
  // their preferred order) and append any newly available ids at the end.
  const cardById = new Map(naturalHand.map((card) => [card.id, card]));
  const orderedIds = handOrder.filter((id) => cardById.has(id));
  const orderedIdSet = new Set(orderedIds);
  for (const card of naturalHand) {
    if (!orderedIdSet.has(card.id)) {
      orderedIds.push(card.id);
      orderedIdSet.add(card.id);
    }
  }
  const hand = orderedIds.map((id) => cardById.get(id)!);

  const handleDraw = () => {
    if (drawPile.length === 0) {
      return;
    }
    const [topCard, ...rest] = drawPile;
    setDrawPile(rest);
    setDrawnCards((cards) => [...cards, topCard]);
  };

  const handleDropCard = (cardId: string) => {
    // The dropped card's hand slot unmounts immediately, so its native
    // dragend never fires — reset the drag-active flag here instead.
    setIsDragActive(false);
    if (playedCard) {
      return;
    }
    const card = hand.find((c) => c.id === cardId);
    if (card) {
      setPlayedCard(card);
    }
  };

  const handleDropOnDrawPile = (cardId: string, position: DrawPilePosition) => {
    setIsDragActive(false);
    const card = hand.find((c) => c.id === cardId);
    if (!card) {
      return;
    }
    setDrawPile((pile) => {
      if (position === 'top') {
        return [card, ...pile];
      }
      if (position === 'bottom') {
        return [...pile, card];
      }
      const index = Math.floor(Math.random() * (pile.length + 1));
      return [...pile.slice(0, index), card, ...pile.slice(index)];
    });
    // Forget this card's old hand position — if it's drawn again later it
    // should land at the end of the hand like any other freshly drawn card,
    // not snap back to where it used to sit.
    setHandOrder((order) => order.filter((id) => id !== cardId));
  };

  return (
    <div className={styles.board}>
      <PlayerHand
        cards={hand}
        onCardDragStart={() => setIsDragActive(true)}
        onCardDragEnd={() => setIsDragActive(false)}
        onReorder={(reordered) => setHandOrder(reordered.map((card) => card.id))}
      />
      <Deck count={drawPile.length} onDraw={handleDraw} />
      <DrawPileDropZone isDragActive={isDragActive} onDropCard={handleDropOnDrawPile} />
      <DropZone
        playedCard={playedCard}
        isDragActive={isDragActive}
        onDropCard={handleDropCard}
        onRemoveCard={() => setPlayedCard(null)}
      />
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

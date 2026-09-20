import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { CardPile } from '../components/CardPile/CardPile';
import { PileDropZone, type PilePosition } from '../components/PileDropZone/PileDropZone';
import { DropZone } from '../components/DropZone/DropZone';
import { PlayerHand } from '../components/PlayerHand/PlayerHand';
import type { CardData } from '../data/cards';
import { buildCharacterDeck, getCharacter, shuffle, type Character } from '../data/characters';
import styles from './GameRoute.module.css';

const INITIAL_HAND_SIZE = 5;

export function GameRoute() {
  const { characterId } = useParams<{ characterId: string }>();
  const character = getCharacter(characterId);

  if (!character) {
    return <Navigate to="/select" replace />;
  }

  return <Game character={character} />;
}

interface GameProps {
  character: Character;
}

function insertAtPosition(pile: CardData[], card: CardData, position: PilePosition): CardData[] {
  if (position === 'top') {
    return [card, ...pile];
  }
  if (position === 'bottom') {
    return [...pile, card];
  }
  const index = Math.floor(Math.random() * (pile.length + 1));
  return [...pile.slice(0, index), card, ...pile.slice(index)];
}

function Game({ character }: GameProps) {
  const [deck] = useState(() => buildCharacterDeck(character));
  const [initialHand] = useState(() => deck.slice(0, INITIAL_HAND_SIZE));
  const [drawPile, setDrawPile] = useState(() => deck.slice(INITIAL_HAND_SIZE));
  const [discardPile, setDiscardPile] = useState<CardData[]>([]);
  const [drawnCards, setDrawnCards] = useState<CardData[]>([]);
  const [playedCard, setPlayedCard] = useState<CardData | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [handOrder, setHandOrder] = useState<string[]>([]);
  const [isViewingDiscard, setIsViewingDiscard] = useState(false);

  const drawPileIds = new Set(drawPile.map((card) => card.id));
  const discardPileIds = new Set(discardPile.map((card) => card.id));
  // A card can move hand -> a pile -> hand again. Once that's happened, its
  // position should come from `drawnCards` (append-ordered, so the most
  // recent draw lands at the end) rather than its original slot in
  // `initialHand` — so exclude it from that portion entirely once drawn.
  const drawnCardIds = new Set(drawnCards.map((card) => card.id));
  const naturalHand = [
    ...initialHand.filter((card) => !drawnCardIds.has(card.id)),
    ...drawnCards,
  ].filter(
    (card) => card.id !== playedCard?.id && !drawPileIds.has(card.id) && !discardPileIds.has(card.id),
  );

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

  const handleReturnFromDiscard = () => {
    if (discardPile.length === 0) {
      return;
    }
    const [topCard, ...rest] = discardPile;
    setDiscardPile(rest);
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

  // A dragged card can come from the hand or (while previewing it) the
  // discard pile itself — check both.
  const findDraggableCard = (cardId: string) =>
    hand.find((c) => c.id === cardId) ?? discardPile.find((c) => c.id === cardId);

  const handleDropOnDrawPile = (cardId: string, position: PilePosition) => {
    setIsDragActive(false);
    const card = findDraggableCard(cardId);
    if (!card) {
      return;
    }
    setDrawPile((pile) => insertAtPosition(pile, card, position));
    const wasLastDiscardedCard = discardPile.length === 1 && discardPile[0].id === cardId;
    setDiscardPile((pile) => pile.filter((c) => c.id !== cardId));
    if (wasLastDiscardedCard) {
      setIsViewingDiscard(false);
    }
    // Forget this card's old hand position — if it comes back to the hand
    // later it should land at the end like any other freshly drawn card,
    // not snap back to where it used to sit.
    setHandOrder((order) => order.filter((id) => id !== cardId));
  };

  const handleDropOnDiscardPile = (cardId: string, position: PilePosition) => {
    setIsDragActive(false);
    const card = findDraggableCard(cardId);
    if (!card) {
      return;
    }
    // Drop the existing occurrence first — the card may already be in the
    // discard pile (reordering via the bands while previewing it).
    setDiscardPile((pile) => insertAtPosition(pile.filter((c) => c.id !== cardId), card, position));
    setHandOrder((order) => order.filter((id) => id !== cardId));
  };

  const handleDropOntoHand = (cardId: string) => {
    setIsDragActive(false);
    if (hand.some((c) => c.id === cardId)) {
      // Already in hand — this is just the normal in-fan reorder drop,
      // already applied live via onReorder while dragging.
      return;
    }
    const card = discardPile.find((c) => c.id === cardId);
    if (!card) {
      return;
    }
    setDiscardPile((pile) => pile.filter((c) => c.id !== cardId));
    setDrawnCards((cards) => [...cards, card]);
    if (discardPile.length === 1) {
      setIsViewingDiscard(false);
    }
  };

  const handleShuffleDiscardPile = () => {
    setDiscardPile((pile) => shuffle(pile));
  };

  return (
    <div className={styles.board}>
      <PlayerHand
        cards={hand}
        interactive={!isViewingDiscard}
        onCardDragStart={() => setIsDragActive(true)}
        onCardDragEnd={() => setIsDragActive(false)}
        onReorder={(reordered) => setHandOrder(reordered.map((card) => card.id))}
        onExternalDrop={handleDropOntoHand}
      />
      <CardPile
        count={drawPile.length}
        image={character.cardBack}
        ariaLabel={`Draw a card (${drawPile.length} remaining)`}
        placement="draw"
        onClick={handleDraw}
        disabled={isViewingDiscard}
      />
      {!isViewingDiscard && (
        <CardPile
          count={discardPile.length}
          image={discardPile[0]?.image ?? ''}
          ariaLabel={`Return top discarded card to your hand (${discardPile.length} in discard pile)`}
          placement="discard"
          onClick={handleReturnFromDiscard}
          onView={() => setIsViewingDiscard(true)}
          onShuffle={handleShuffleDiscardPile}
        />
      )}
      <PileDropZone placement="draw" isDragActive={isDragActive} onDropCard={handleDropOnDrawPile} />
      <PileDropZone
        placement="discard"
        isDragActive={isDragActive && !isViewingDiscard}
        onDropCard={handleDropOnDiscardPile}
      />
      <DropZone
        playedCard={playedCard}
        isDragActive={isDragActive && !isViewingDiscard}
        onDropCard={handleDropCard}
        onRemoveCard={() => setPlayedCard(null)}
      />
      {isViewingDiscard && (
        <div className={styles.discardPreview} onClick={() => setIsViewingDiscard(false)}>
          {/* The fan gives later array entries a higher z-index (rendered in
              front), so the pile's top card (discardPile[0]) needs to be
              last here to visually read as "on top" rather than buried
              behind the rest. Un-reverse on the way back out so the stored
              order keeps discardPile[0] meaning "top" after a reorder. */}
          <PlayerHand
            cards={[...discardPile].reverse()}
            variant="preview"
            onCardDragStart={() => setIsDragActive(true)}
            onCardDragEnd={() => setIsDragActive(false)}
            onReorder={(reordered) => setDiscardPile([...reordered].reverse())}
          />
        </div>
      )}
    </div>
  );
}

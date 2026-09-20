import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CardPile } from '../components/CardPile/CardPile';
import { PileDropZone, type PilePosition } from '../components/PileDropZone/PileDropZone';
import { DropZone } from '../components/DropZone/DropZone';
import { PlayerHand } from '../components/PlayerHand/PlayerHand';
import { OpponentPanel } from '../components/OpponentPanel/OpponentPanel';
import { toClientCard, type CardData } from '../data/cards';
import { getCharacter, type Character } from '../data/characters';
import { useGameConnection } from '../net/GameConnectionProvider';
import type { GameAction, GameStateView } from '../shared/protocol';
import styles from './GameRoute.module.css';

export function GameRoute() {
  const { state, status, error, send } = useGameConnection();

  if (error) {
    return (
      <div className={styles.board}>
        <p className={styles.status}>{error}</p>
      </div>
    );
  }

  if (!state) {
    return (
      <div className={styles.board}>
        <p className={styles.status}>{status === 'closed' ? 'Reconnecting…' : 'Connecting…'}</p>
      </div>
    );
  }

  if (!state.me.characterId) {
    return <Navigate to="/select" replace />;
  }

  if (state.phase === 'selecting') {
    return (
      <div className={styles.board}>
        <p className={styles.status}>Waiting for opponent to join…</p>
      </div>
    );
  }

  // characterId is guaranteed present by the game server, which only ever
  // sets it from the same catalog this client uses.
  const character = getCharacter(state.me.characterId)!;

  return <Game state={state} character={character} send={send} />;
}

interface GameProps {
  state: GameStateView;
  character: Character;
  send: (action: GameAction) => void;
}

function Game({ state, character, send }: GameProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  // The actual card currently being dragged, from either hand — lets the
  // real hand show a live "where this would land" preview for a card
  // dragged in from the discard-pile preview (dataTransfer's payload isn't
  // readable during dragover/dragenter, only at drop, so this has to be
  // tracked as real state rather than read off the native drag event).
  const [draggedCard, setDraggedCard] = useState<CardData | null>(null);
  const [isViewingDiscard, setIsViewingDiscard] = useState(false);

  const hand = state.me.hand.map(toClientCard);
  const discardPile = state.me.discardPile.map(toClientCard);
  const playedCard = state.me.playedCard ? toClientCard(state.me.playedCard) : null;

  const opponent = state.opponent;
  const opponentCharacter = opponent?.characterId ? getCharacter(opponent.characterId) : undefined;
  const opponentDiscardPile = opponent ? opponent.discardPile.map(toClientCard) : [];
  const opponentPlayedCard = opponent?.playedCard ? toClientCard(opponent.playedCard) : null;

  // The discard preview can only ever be open on a non-empty pile — if the
  // pile empties out from under it (last card dragged away), close it.
  useEffect(() => {
    if (discardPile.length === 0 && isViewingDiscard) {
      setIsViewingDiscard(false);
    }
  }, [discardPile.length, isViewingDiscard]);

  const handleDraw = () => send({ type: 'draw' });
  const handleReturnFromDiscard = () => send({ type: 'returnFromDiscard' });
  const handleShuffleDiscardPile = () => send({ type: 'shuffleDiscard' });

  const handleDropCard = (cardId: string) => {
    // The dropped card's hand slot unmounts immediately, so its native
    // dragend never fires — reset the drag-active flag here instead.
    setIsDragActive(false);
    setDraggedCard(null);
    send({ type: 'playCard', cardId });
  };

  const handleDropOnDrawPile = (cardId: string, position: PilePosition) => {
    setIsDragActive(false);
    setDraggedCard(null);
    send({ type: 'dropOnDrawPile', cardId, position });
  };

  const handleDropOnDiscardPile = (cardId: string, position: PilePosition) => {
    setIsDragActive(false);
    setDraggedCard(null);
    send({ type: 'dropOnDiscardPile', cardId, position });
  };

  const handleDropOntoHand = (cardId: string, index: number) => {
    setIsDragActive(false);
    setDraggedCard(null);
    if (hand.some((c) => c.id === cardId)) {
      // Already in hand — this is just the normal in-fan reorder drop,
      // already applied live via onReorder while dragging.
      return;
    }
    send({ type: 'dropOntoHand', cardId, index });
  };

  return (
    <div className={styles.board}>
      <OpponentPanel
        characterName={opponentCharacter?.name ?? null}
        connected={opponent?.connected ?? false}
        cardBack={opponentCharacter?.cardBack ?? character.cardBack}
        handCount={opponent?.handCount ?? 0}
        drawPileCount={opponent?.drawPileCount ?? 0}
        discardPile={opponentDiscardPile}
        playedCard={opponentPlayedCard}
      />
      <PlayerHand
        cards={hand}
        interactive={!isViewingDiscard}
        incomingCard={draggedCard && !hand.some((c) => c.id === draggedCard.id) ? draggedCard : undefined}
        onCardDragStart={(card) => {
          setIsDragActive(true);
          setDraggedCard(card);
        }}
        onCardDragEnd={() => {
          setIsDragActive(false);
          setDraggedCard(null);
        }}
        onReorder={(reordered) => send({ type: 'reorderHand', order: reordered.map((card) => card.id) })}
        onExternalDrop={handleDropOntoHand}
      />
      <CardPile
        count={state.me.drawPileCount}
        image={character.cardBack}
        ariaLabel={`Draw a card (${state.me.drawPileCount} remaining)`}
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
        onRemoveCard={() => send({ type: 'removePlayedCard' })}
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
            onCardDragStart={(card) => {
              setIsDragActive(true);
              setDraggedCard(card);
            }}
            onCardDragEnd={() => {
              setIsDragActive(false);
              setDraggedCard(null);
            }}
            onReorder={(reordered) =>
              send({ type: 'reorderDiscard', order: [...reordered].reverse().map((card) => card.id) })
            }
          />
        </div>
      )}
    </div>
  );
}

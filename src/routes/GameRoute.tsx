import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ActionButtons } from '../components/ActionButtons/ActionButtons';
import { AliceCoin } from '../components/AliceCoin/AliceCoin';
import { CardPile } from '../components/CardPile/CardPile';
import { PileDropZone, type PilePosition } from '../components/PileDropZone/PileDropZone';
import { PlayerHand } from '../components/PlayerHand/PlayerHand';
import { ConfirmDialog } from '../components/ConfirmDialog/ConfirmDialog';
import { InfoButton } from '../components/InfoButton/InfoButton';
import { CharacterCardDialog } from '../components/CharacterCardDialog/CharacterCardDialog';
import { GameMenu } from '../components/GameMenu/GameMenu';
import { Map } from '../components/Map/Map';
import { ServeArea } from '../components/ServeArea/ServeArea';
import { toClientCard, type CardData } from '../data/cards';
import { getCharacter, type Character } from '../data/characters';
import { MAPS, type MapInfo } from '../data/maps';
import { useGameConnection } from '../net/GameConnectionProvider';
import type { GameAction, GameStateView, PlayerSlot } from '../shared/protocol';
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

  if (!state.me.characterId || state.phase === 'character-select') {
    return <Navigate to="/select" replace />;
  }

  if (state.phase === 'map-select') {
    return <Navigate to="/maps" replace />;
  }

  // characterId is guaranteed present by the game server, which only ever
  // sets it from the same catalog this client uses.
  const character = getCharacter(state.me.characterId)!;
  // selectedMapId is shared/server-synced (set via MapSelectRoute), so both
  // players land on the same map here — MAPS[0] is only a fallback for the
  // (should-be-unreachable-via-normal-flow) case of no map ever being picked.
  const map = MAPS.find((m) => m.id === state.selectedMapId) ?? MAPS[0];

  return <Game state={state} character={character} map={map} send={send} />;
}

interface GameProps {
  state: GameStateView;
  character: Character;
  map: MapInfo | undefined;
  send: (action: GameAction) => void;
}

function Game({ state, character, map, send }: GameProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  // The actual card currently being dragged, from either hand — lets the
  // real hand show a live "where this would land" preview for a card
  // dragged in from the discard-pile preview (dataTransfer's payload isn't
  // readable during dragover/dragenter, only at drop, so this has to be
  // tracked as real state rather than read off the native drag event).
  const [draggedCard, setDraggedCard] = useState<CardData | null>(null);
  const [isViewingDiscard, setIsViewingDiscard] = useState(false);
  const [isViewingDraw, setIsViewingDraw] = useState(false);
  // A read-only look at the opponent's discard pile — no dragging/reorder,
  // just the same fanned view.
  const [isViewingOpponentDiscard, setIsViewingOpponentDiscard] = useState(false);
  // Mirrors the real hand's own auto-hide dock open/closed state (reported
  // via onDockOpenChange), so the map can dim in step with it.
  const [isHandOpen, setIsHandOpen] = useState(false);
  // Which pile's shuffle is pending confirmation, if any.
  const [shuffleConfirm, setShuffleConfirm] = useState<'draw' | 'discard' | null>(null);
  // Whose character card is currently being viewed, if any.
  const [viewingCharacterCard, setViewingCharacterCard] = useState<'me' | 'opponent' | null>(null);
  // Dims the map behind any of the hand/pile fanned-card views, so they
  // read more clearly against it.
  const isMapDimmed = isHandOpen || isViewingDiscard || isViewingDraw || isViewingOpponentDiscard;

  const hand = state.me.hand.map(toClientCard);
  const drawPile = state.me.drawPile.map(toClientCard);
  const discardPile = state.me.discardPile.map(toClientCard);
  const servePile = state.me.servePile.map(toClientCard);
  const revealedServe = state.me.revealedServe.map(toClientCard);
  // A serve mode locks both players' action buttons; only the player who
  // started it gets the center staging area.
  const isServing = state.serve?.activator === state.mySlot;
  const hasRevealedServe = revealedServe.length > 0;
  // Both center fans live where the draw/discard previews open, so they
  // step aside rather than overlapping one.
  const isViewingAPile = isViewingDiscard || isViewingDraw || isViewingOpponentDiscard;

  const opponent = state.opponent;
  const opponentSlot: PlayerSlot = state.mySlot === 'player1' ? 'player2' : 'player1';
  const opponentCharacter = opponent?.characterId ? getCharacter(opponent.characterId) : undefined;
  const opponentDiscardPile = opponent ? opponent.discardPile.map(toClientCard) : [];
  const opponentCardBack = opponentCharacter?.cardBack ?? character.cardBack;
  const characterIds: Record<PlayerSlot, string | null> =
    state.mySlot === 'player1'
      ? { player1: state.me.characterId, player2: opponent?.characterId ?? null }
      : { player2: state.me.characterId, player1: opponent?.characterId ?? null };
  // The opponent's hand is hidden — only its count is known — so these are
  // placeholder card-backs, not real cards. Stable, index-based ids (rather
  // than fresh ones per render) keep the fan from remounting every render.
  const opponentHand: CardData[] = Array.from({ length: opponent?.handCount ?? 0 }, (_, i) => ({
    id: `opponent-hand-${i}`,
    image: opponentCardBack,
  }));

  // Each preview can only ever be open on a non-empty pile — if a pile
  // empties out from under it (last card dragged away), close it.
  useEffect(() => {
    if (discardPile.length === 0 && isViewingDiscard) {
      setIsViewingDiscard(false);
    }
  }, [discardPile.length, isViewingDiscard]);

  useEffect(() => {
    if (drawPile.length === 0 && isViewingDraw) {
      setIsViewingDraw(false);
    }
  }, [drawPile.length, isViewingDraw]);

  useEffect(() => {
    if (opponentDiscardPile.length === 0 && isViewingOpponentDiscard) {
      setIsViewingOpponentDiscard(false);
    }
  }, [opponentDiscardPile.length, isViewingOpponentDiscard]);

  // Escape backs out of whichever serve thing is on screen for me: my own
  // in-progress serve (staged cards go back to my hand), or the serve my
  // opponent showed me.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') {
        return;
      }
      if (isServing) {
        send({ type: 'cancelServeMode' });
      } else if (hasRevealedServe) {
        send({ type: 'clearRevealedServe' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isServing, hasRevealedServe, send]);

  const handleDraw = () => send({ type: 'draw' });
  const handleReturnFromDiscard = () => send({ type: 'returnFromDiscard' });
  const handleShuffleDiscardPile = () => send({ type: 'shuffleDiscard' });
  const handleShuffleDrawPile = () => send({ type: 'shuffleDrawPile' });

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

  const handleServeCard = (cardId: string, index: number) => {
    setIsDragActive(false);
    setDraggedCard(null);
    if (servePile.some((c) => c.id === cardId)) {
      // Already staged — a plain in-fan reorder, applied live via onReorder.
      return;
    }
    send({ type: 'serveCard', cardId, index });
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
      {map && (
        <Map
          image={map.image}
          dimmed={isMapDimmed}
          coins={state.coins}
          mySlot={state.mySlot}
          characterIds={characterIds}
          onCoinDragStart={(owner, coinType, minionIndex) =>
            send({ type: 'startDragCoin', coinOwner: owner, coinType, minionIndex })
          }
          onCoinMove={(owner, coinType, minionIndex, x, y) =>
            send({ type: 'moveCoin', coinOwner: owner, coinType, minionIndex, x, y })
          }
          onCoinDragEnd={(owner, coinType, minionIndex) =>
            send({ type: 'endDragCoin', coinOwner: owner, coinType, minionIndex })
          }
          onUpdateCoinHealth={(owner, coinType, minionIndex, health) =>
            send({ type: 'updateCoinHealth', coinOwner: owner, coinType, minionIndex, health })
          }
        />
      )}
      <GameMenu onReturnToMainMenu={() => send({ type: 'returnToMainMenu' })} />
      <ActionButtons
        characterId={character.id}
        disabled={state.serve !== null}
        onSingle={() => send({ type: 'activateServeMode', mode: 'single' })}
        onDouble={() => send({ type: 'activateServeMode', mode: 'double' })}
      />
      {/* Opponent's board, mirrored upside-down at the top — same
          components as our own piles/hand, just repositioned/read-only. */}
      <PlayerHand cards={opponentHand} variant="opponent" interactive={false} />
      <CardPile
        count={opponent?.drawPileCount ?? 0}
        image={opponentCardBack}
        ariaLabel={`Opponent's deck (${opponent?.drawPileCount ?? 0} remaining)`}
        placement="opponent-draw"
        onClick={() => {}}
        disabled
      />
      {opponentCharacter?.id === 'alice' && (
        <AliceCoin
          mirrored
          big={opponent?.aliceCoinBig ?? false}
          onToggle={() => send({ type: 'toggleAliceCoin', owner: opponentSlot })}
        />
      )}
      {!isViewingOpponentDiscard && (
        <CardPile
          count={opponentDiscardPile.length}
          image={opponentDiscardPile[0]?.image ?? ''}
          ariaLabel={`View opponent's discard pile (${opponentDiscardPile.length} cards)`}
          placement="opponent-discard"
          onClick={() => {
            setIsViewingOpponentDiscard(true);
            setIsViewingDiscard(false);
            setIsViewingDraw(false);
          }}
        />
      )}
      {opponentCharacter && (
        <InfoButton
          placement="opponent"
          anchor={opponentDiscardPile.length === 0 ? 'draw' : 'discard'}
          ariaLabel={`View ${opponentCharacter.name}'s character card`}
          onClick={() => setViewingCharacterCard('opponent')}
        />
      )}
      <PlayerHand
        cards={hand}
        interactive={!isViewingDiscard && !isViewingDraw && !isViewingOpponentDiscard}
        // Unlike our own discard/draw previews, the opponent's discard
        // preview is read-only with nothing to drag in or out of — no
        // reason to force the hand open just because it's showing. A serve
        // in progress also keeps it open: that's where its cards come from.
        forceOpen={isViewingDiscard || isViewingDraw || isServing}
        onDockOpenChange={setIsHandOpen}
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
      {!isViewingDraw && (
        <CardPile
          count={state.me.drawPileCount}
          image={character.cardBack}
          ariaLabel={`Draw a card (${state.me.drawPileCount} remaining)`}
          placement="draw"
          onClick={handleDraw}
          disabled={isViewingDiscard || isViewingOpponentDiscard}
          onView={() => {
            setIsViewingDraw(true);
            setIsViewingDiscard(false);
            setIsViewingOpponentDiscard(false);
          }}
          onShuffle={() => setShuffleConfirm('draw')}
        />
      )}
      {character.id === 'alice' && (
        <AliceCoin
          mirrored={false}
          big={state.me.aliceCoinBig}
          onToggle={() => send({ type: 'toggleAliceCoin', owner: state.mySlot })}
        />
      )}
      {!isViewingDiscard && (
        <CardPile
          count={discardPile.length}
          image={discardPile[0]?.image ?? ''}
          ariaLabel={`Return top discarded card to your hand (${discardPile.length} in discard pile)`}
          placement="discard"
          onClick={handleReturnFromDiscard}
          disabled={isViewingDraw || isViewingOpponentDiscard}
          onView={() => {
            setIsViewingDiscard(true);
            setIsViewingDraw(false);
            setIsViewingOpponentDiscard(false);
          }}
          onShuffle={() => setShuffleConfirm('discard')}
        />
      )}
      <InfoButton
        placement="player"
        anchor={discardPile.length === 0 ? 'draw' : 'discard'}
        ariaLabel={`View ${character.name}'s character card`}
        onClick={() => setViewingCharacterCard('me')}
      />
      <PileDropZone
        placement="draw"
        isDragActive={isDragActive && !isViewingDraw}
        onDropCard={handleDropOnDrawPile}
      />
      <PileDropZone
        placement="discard"
        isDragActive={isDragActive && !isViewingDiscard}
        onDropCard={handleDropOnDiscardPile}
      />
      {/* My own serve, mid-staging — a live fan, not a stacked pile. Steps
          aside while a draw/discard preview is open, since those fan out in
          the same place. */}
      {isServing && state.serve?.mode === 'single' && !isViewingAPile && (
        <ServeArea
          cards={servePile}
          incomingCard={draggedCard && !servePile.some((c) => c.id === draggedCard.id) ? draggedCard : undefined}
          isDragActive={isDragActive}
          onServeCard={handleServeCard}
          onConfirm={() => send({ type: 'confirmServe' })}
          onCardDragStart={(card) => {
            setIsDragActive(true);
            setDraggedCard(card);
          }}
          onCardDragEnd={() => {
            setIsDragActive(false);
            setDraggedCard(null);
          }}
          onReorder={(reordered) => send({ type: 'reorderServePile', order: reordered.map((card) => card.id) })}
        />
      )}
      {/* What my opponent served me — read-only, and only on my screen. */}
      {hasRevealedServe && !isViewingAPile && (
        <PlayerHand cards={revealedServe} variant="preview" interactive={false} hoverOnly />
      )}
      {isViewingDraw && (
        <div className={styles.pilePreview} onClick={() => setIsViewingDraw(false)}>
          {/* Unlike the discard preview below, shown in natural deck order,
              unreversed: drawPile[0] ("next to be drawn") reads as the
              backmost card in the fan, with the bottom of the deck
              frontmost. */}
          <PlayerHand
            cards={drawPile}
            variant="preview"
            onCardDragStart={(card) => {
              setIsDragActive(true);
              setDraggedCard(card);
            }}
            onCardDragEnd={() => {
              setIsDragActive(false);
              setDraggedCard(null);
            }}
            onReorder={(reordered) => send({ type: 'reorderDrawPile', order: reordered.map((card) => card.id) })}
          />
        </div>
      )}
      {isViewingDiscard && (
        <div className={styles.pilePreview} onClick={() => setIsViewingDiscard(false)}>
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
      {isViewingOpponentDiscard && (
        <div className={styles.pilePreview} onClick={() => setIsViewingOpponentDiscard(false)}>
          {/* Read-only — interactive=false and no drag/reorder handlers, so
              nothing can be picked up, reordered, or dragged out of it.
              hoverOnly keeps the same hover-to-zoom focus effect as the
              other (draggable) previews despite that. */}
          <PlayerHand
            cards={[...opponentDiscardPile].reverse()}
            variant="preview"
            interactive={false}
            hoverOnly
          />
        </div>
      )}
      {shuffleConfirm && (
        <ConfirmDialog
          message={`Shuffle the ${shuffleConfirm === 'draw' ? 'deck' : 'discard pile'}?`}
          confirmLabel="Shuffle"
          onConfirm={() => {
            if (shuffleConfirm === 'draw') {
              handleShuffleDrawPile();
            } else {
              handleShuffleDiscardPile();
            }
            setShuffleConfirm(null);
          }}
          onCancel={() => setShuffleConfirm(null)}
        />
      )}
      {viewingCharacterCard && (
        <CharacterCardDialog
          image={viewingCharacterCard === 'me' ? character.characterCard : (opponentCharacter?.characterCard ?? '')}
          characterName={viewingCharacterCard === 'me' ? character.name : (opponentCharacter?.name ?? '')}
          onClose={() => setViewingCharacterCard(null)}
        />
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  playButtonClickSound,
  playCardDealSound,
  playCardFlipSound,
  playCardShuffleSound,
  playCoinFlipSound,
  playCoinPickUpSound,
  playCoinPutDownSound,
  playDarknessSound,
  playHealSound,
  playMeowSound,
  playHitSound,
  playResurrectSound,
  playSquirrelSqueakSound,
} from '../audio/sounds';
import { useCoinDragSound } from '../audio/useCoinDragSound';
import { useCoinFlipSound } from '../audio/useCoinFlipSound';
import { useTallySound } from '../audio/useTallySound';
import { CharacterActionButton } from '../components/CharacterActionButton/CharacterActionButton';
import { CardPile } from '../components/CardPile/CardPile';
import { CatDance } from '../components/CatDance/CatDance';
import { PileDropZone, type PilePosition } from '../components/PileDropZone/PileDropZone';
import { PlayerHand } from '../components/PlayerHand/PlayerHand';
import { ConfirmDialog } from '../components/ConfirmDialog/ConfirmDialog';
import { DragPreview } from '../components/DragPreview/DragPreview';
import { draggedCardCentre } from '../components/DragPreview/draggedCardCentre';
import { InfoButton } from '../components/InfoButton/InfoButton';
import { CharacterCardDialog } from '../components/CharacterCardDialog/CharacterCardDialog';
import { GameMenu } from '../components/GameMenu/GameMenu';
import { Map } from '../components/Map/Map';
import { OpponentCursor } from '../components/OpponentCursor/OpponentCursor';
import { OpponentDraggedCard } from '../components/OpponentDraggedCard/OpponentDraggedCard';
import { toClientCard, type CardData } from '../data/cards';
import { characterGlowRgb } from '../data/characterColors';
import { getCharacter, type Character } from '../data/characters';
import { MAPS, type MapInfo } from '../data/maps';
import { useGameConnection } from '../net/GameConnectionProvider';
import { getCharacterDef } from '../shared/characters';
import { SHADOW_TOKEN_LIMIT } from '../shared/protocol';
import type { GameAction, GameStateView, PlayerSlot, WireCard } from '../shared/protocol';
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
  // Only set for a card picked up off the board, which is held at the exact
  // point it was grabbed rather than at a fixed spot under the cursor.
  // Written at the start of *every* drag (to null for hand/pile cards), so
  // a leftover offset can never carry into the next one.
  const [draggedCardCentreOffset, setDraggedCardCentreOffset] = useState<{ x: number; y: number } | null>(null);
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
  // Offering our hand up to the opponent is irreversible once done, so it
  // goes through a confirmation the way shuffling does.
  const [showHandConfirm, setShowHandConfirm] = useState(false);
  // Whose character card is currently being viewed, if any.
  const [viewingCharacterCard, setViewingCharacterCard] = useState<'me' | 'opponent' | null>(null);
  // A card that's just been dropped into a different pile, hidden from the
  // pile it came from until the server's echo lands. Without this it pops
  // back into the source fan for the length of the round trip: the fan hides
  // it mid-drag, then un-hides it on dragend, and only the server's reply
  // actually takes it out of the list — which reads as a one-frame flicker.
  // The server mints a fresh id on every move, so filtering the old id can
  // never hide the card at its destination.
  const [movingCardId, setMovingCardId] = useState<string | null>(null);
  // Every action is answered with a broadcast, so exactly one state update
  // is how long the optimistic hide needs to last. It also means a move the
  // server rejected correctly puts the card back rather than stranding it.
  useEffect(() => {
    setMovingCardId(null);
  }, [state]);

  // Both players hear both players' deals and flips. Driven off the server's
  // own tallies rather than the clicks that caused them, so the two screens
  // play in step and neither plays for an action the server refused.
  useTallySound(state.me.cardsDrawn, state.opponent?.cardsDrawn ?? null, playCardDealSound);
  useTallySound(state.me.boardCardsFlipped, state.opponent?.boardCardsFlipped ?? null, playCardFlipSound);
  useTallySound(state.me.minionsResurrected, state.opponent?.minionsResurrected ?? null, playResurrectSound);
  useTallySound(state.me.pilesShuffled, state.opponent?.pilesShuffled ?? null, playCardShuffleSound);
  // Reuses the deal sound — one counter for both "onto the board" and "into
  // the discard pile" since either way it's the same sound.
  useTallySound(state.me.cardsPlaced, state.opponent?.cardsPlaced ?? null, playCardDealSound);
  // Two counters rather than one: which way a health edit went is exactly what
  // picks the sound, so the direction has to survive the trip.
  useTallySound(state.me.coinsHealed, state.opponent?.coinsHealed ?? null, playHealSound);
  useTallySound(state.me.coinsHit, state.opponent?.coinsHit ?? null, playHitSound);
  // Darkness has no separate per-player tally to pair up here — state.darkness
  // is already shared and only-grows (see playDarknessSound) — so it's passed
  // as the "mine" side alone, with "theirs" pinned to null so the hook's
  // opponent-side check can never itself trigger a second play of the same rise.
  useTallySound(state.darkness.length, null, playDarknessSound);
  // Same shape as darkness: a single shared count, so it's the "mine" side with
  // "theirs" pinned to null.
  useTallySound(state.catDanceCount, null, playMeowSound);
  // Neither of these is a tally — the same coin can be picked up, put down and
  // turned over any number of times — so they diff the coins' own shared state
  // per coin instead of watching a count. See each hook for why.
  useCoinDragSound(state.coins, playCoinPickUpSound, playCoinPutDownSound);
  useCoinFlipSound(state.coins, playCoinFlipSound);

  const visible = (cards: WireCard[]) => cards.filter((c) => c.id !== movingCardId).map(toClientCard);
  const hand = visible(state.me.hand);
  const drawPile = visible(state.me.drawPile);
  const discardPile = visible(state.me.discardPile);
  // The opponent's hand, if they've chosen to show it to us.
  const revealedHand = state.me.revealedHand.map(toClientCard);
  // Dims the map behind any of the hand/pile fanned-card views, so they
  // read more clearly against it.
  const isMapDimmed =
    isHandOpen || isViewingDiscard || isViewingDraw || isViewingOpponentDiscard || revealedHand.length > 0;
  // The two players sit across the board from each other: player1 always
  // gets the map the right way up, player2 always the 180°-rotated copy.
  // Fixed by slot, the same way the coins pick their starting sides.
  const viewsInverseMap = state.mySlot === 'player2';

  const opponent = state.opponent;
  const opponentCharacter = opponent?.characterId ? getCharacter(opponent.characterId) : undefined;
  const opponentDiscardPile = opponent ? opponent.discardPile.map(toClientCard) : [];
  const opponentCardBack = opponentCharacter?.cardBack ?? character.cardBack;
  // A board card the opponent has picked up is hidden from the map for as
  // long as they're holding it: their floating copy of it is the one to
  // watch, not both at once. Safe to drop outright here rather than merely
  // style it away, the way our own dragged card has to be — on this screen
  // it isn't a drag source, so nothing depends on it staying mounted. The
  // untouched array is kept when there's no such card, so its identity is
  // stable for the map's own effects.
  const opponentDraggedCardId = opponent?.draggedCard?.cardId ?? null;
  const boardCards = opponentDraggedCardId
    ? state.boardCards.filter((boardCard) => boardCard.id !== opponentDraggedCardId)
    : state.boardCards;
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

  // Let the opponent's mirrored copy of our hand move in step with ours.
  // Hover-driven, so this changes far too rarely to need any throttling.
  useEffect(() => {
    send({ type: 'setHandOpen', open: isHandOpen });
  }, [isHandOpen, send]);

  // Shift + C sets the dancing cat off on both screens. Fired on every press,
  // with no local check for one already playing: the server holds that gate
  // (see `startCatDance`), so it's one gate for both players rather than two
  // that could disagree.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shift alone — ctrl/cmd/alt + shift + C are the browser's own (devtools,
      // among others), and shouldn't put a cat up as a side effect.
      if (!e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || e.key.toLowerCase() !== 'c') {
        return;
      }
      // Holding the keys down auto-repeats; the server would refuse every one
      // of those anyway, so don't spend the socket on them.
      if (e.repeat) {
        return;
      }
      // Never while typing — the health dialog's field is the one place to
      // worry about, but this holds for anything text-like.
      const target = e.target as HTMLElement | null;
      if (target?.isContentEditable || target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        return;
      }
      send({ type: 'startCatDance' });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [send]);

  // Mirror our own mouse over to the opponent. Coalesced to one send per
  // animation frame, the same way coin dragging is, so a fast mouse can't
  // outpace the socket. Reported as a percentage of our viewport, since
  // their window is very unlikely to be the same size as ours.
  const cursorFrameRef = useRef<number | null>(null);
  const pendingCursorRef = useRef<{ x: number; y: number } | null>(null);
  const pendingDragRef = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const flush = () => {
      cursorFrameRef.current = null;
      const pending = pendingCursorRef.current;
      if (pending) {
        pendingCursorRef.current = null;
        send({ type: 'moveCursor', x: pending.x, y: pending.y });
      }
      // Rides the same frame as the cursor, off the same pointer events, so
      // the card and the hand carrying it can't drift apart over there.
      const pendingDrag = pendingDragRef.current;
      if (pendingDrag && draggedCard) {
        pendingDragRef.current = null;
        send({ type: 'dragCardTo', cardId: draggedCard.id, x: pendingDrag.x, y: pendingDrag.y });
      }
    };
    const toViewportPercent = (clientX: number, clientY: number) => ({
      x: (clientX / window.innerWidth) * 100,
      y: (clientY / window.innerHeight) * 100,
    });
    const report = (clientX: number, clientY: number) => {
      pendingCursorRef.current = toViewportPercent(clientX, clientY);
      if (draggedCard) {
        // Derived the same way our own preview places itself, so what the
        // opponent sees matches what we see.
        const centre = draggedCardCentre({ x: clientX, y: clientY }, draggedCardCentreOffset);
        pendingDragRef.current = toViewportPercent(centre.x, centre.y);
      }
      if (cursorFrameRef.current === null) {
        cursorFrameRef.current = requestAnimationFrame(flush);
      }
    };
    const handleMouseMove = (e: MouseEvent) => report(e.clientX, e.clientY);
    const handleDragOver = (e: DragEvent) => {
      // Drag events report (0, 0) in some browsers, notably the last one of
      // a gesture — reporting that would fling both into the corner.
      if (e.clientX === 0 && e.clientY === 0) {
        return;
      }
      report(e.clientX, e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    // `mousemove` goes completely silent for the duration of a native drag,
    // which is exactly when there's a card to report — `dragover` is what
    // keeps firing meanwhile. Capture phase so nothing can stop it.
    document.addEventListener('dragover', handleDragOver, true);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('dragover', handleDragOver, true);
      if (cursorFrameRef.current !== null) {
        cancelAnimationFrame(cursorFrameRef.current);
        cursorFrameRef.current = null;
      }
    };
  }, [send, draggedCard, draggedCardCentreOffset]);

  // Tells the opponent to stop drawing the card once we've let go of it.
  // Watching for the transition rather than just `!draggedCard` keeps this
  // from firing on mount, and from re-firing on every unrelated re-render.
  const wasDraggingRef = useRef(false);
  useEffect(() => {
    const isDragging = draggedCard !== null;
    if (wasDraggingRef.current && !isDragging) {
      send({ type: 'endCardDrag' });
    }
    wasDraggingRef.current = isDragging;
  }, [draggedCard, send]);

  const handleDraw = () => send({ type: 'draw' });
  const handleReturnFromDiscard = () => send({ type: 'returnFromDiscard' });
  const handleShuffleDiscardPile = () => send({ type: 'shuffleDiscard' });
  const handleShuffleDrawPile = () => send({ type: 'shuffleDrawPile' });

  const handleDropOnDrawPile = (cardId: string, position: PilePosition) => {
    setIsDragActive(false);
    setDraggedCard(null);
    setMovingCardId(cardId);
    send({ type: 'dropOnDrawPile', cardId, position });
  };

  const handleDropOnDiscardPile = (cardId: string, position: PilePosition) => {
    setIsDragActive(false);
    setDraggedCard(null);
    setMovingCardId(cardId);
    send({ type: 'dropOnDiscardPile', cardId, position });
  };

  /** Shared by the hand and both pile previews. Cards from those hang from
   *  a fixed point under the cursor, so any offset left over from a
   *  board-card drag is cleared here rather than carrying into this one. */
  const handleCardDragStart = (card: CardData) => {
    setIsDragActive(true);
    setDraggedCard(card);
    setDraggedCardCentreOffset(null);
  };

  const handleDropCardOnBoard = (cardId: string, x: number, y: number) => {
    setIsDragActive(false);
    setDraggedCard(null);
    // Hides it from the hand for the round trip if that's where it came
    // from; a no-op for a card already lying on the board, whose id isn't
    // in any of the filtered piles.
    setMovingCardId(cardId);
    send({ type: 'dropCardOnBoard', cardId, x, y });
  };

  /** Willow bringing her minion back. The health it revives on, and the rules
   *  about when it may happen at all, are the server's — this only names the
   *  minion. */
  const handleResurrectMinion = (minionIndex: number) => {
    send({ type: 'resurrectMinion', minionIndex });
  };

  // My own fallen minions: which one to bring back (the action names a single
  // minion, so the first down is the one a click revives), and how many are
  // down in total. Willow only ever has the one, but Yennenga has two archers
  // and her button reads the count, so neither assumes a number.
  const myMinions = state.coins[state.mySlot].minions;
  const deadMinionIndex = myMinions.findIndex((minion) => minion.health <= 0);
  const deadMinionCount = myMinions.filter((minion) => minion.health <= 0).length;

  // For the characters who conjure their own minions (Squirrel Girl, Sun
  // Wukong), how many they have left to spawn — what their button counts down
  // and disappears at. Nothing removes a spawned minion, so the coins they
  // have on the board are exactly the ones they've spent.
  const spawnableMinionLimit = getCharacterDef(character.id)?.spawnableMinionLimit ?? 0;
  const spawnableMinionsLeft = Math.max(0, spawnableMinionLimit - myMinions.length);

  // The count as it stood when this board came on screen. CatDance animates on
  // being mounted, so without a baseline every dance already on the tally
  // would replay on arrival — on a mid-game refresh, say. Lazily initialised,
  // so it's the count at mount and never recomputed.
  const [initialCatDanceCount] = useState(() => state.catDanceCount);

  const handleDropOntoHand = (cardId: string, index: number) => {
    setIsDragActive(false);
    setDraggedCard(null);
    if (hand.some((c) => c.id === cardId)) {
      // Already in hand — this is just the normal in-fan reorder drop,
      // already applied live via onReorder while dragging.
      return;
    }
    setMovingCardId(cardId);
    send({ type: 'dropOntoHand', cardId, index });
  };

  return (
    <div className={styles.board}>
      {map && (
        <Map
          image={viewsInverseMap ? map.inverseImage : map.image}
          dimmed={isMapDimmed}
          inverted={viewsInverseMap}
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
          onToggleCoinAltSide={(owner, coinType, minionIndex) =>
            send({ type: 'toggleCoinAltSide', coinOwner: owner, coinType, minionIndex })
          }
          boardCards={boardCards}
          darkness={state.darkness}
          onMoveDarkness={(id, x, y) => send({ type: 'moveDarkness', id, x, y })}
          onDropCardOnBoard={handleDropCardOnBoard}
          onFlipBoardCard={(cardId) => send({ type: 'flipBoardCard', cardId })}
          draggedCardCentreOffset={draggedCardCentreOffset}
          onBoardCardDragStart={(card, centreOffset) => {
            setIsDragActive(true);
            setDraggedCard(card);
            setDraggedCardCentreOffset(centreOffset);
          }}
          onBoardCardDragEnd={() => {
            setIsDragActive(false);
            setDraggedCard(null);
          }}
        />
      )}
      <GameMenu onReturnToMainMenu={() => send({ type: 'returnToMainMenu' })} />
      {/* Opponent's board, mirrored upside-down at the top — same
          components as our own piles/hand, just repositioned/read-only. */}
      {/* Still just card backs — the server never sends us their actual
          cards, only the count — but it rises and falls with their own
          hand so we can see when they're looking through it. */}
      <PlayerHand
        cards={opponentHand}
        variant="opponent"
        interactive={false}
        forceOpen={opponent?.handOpen ?? false}
      />
      <CardPile
        count={opponent?.drawPileCount ?? 0}
        image={opponentCardBack}
        ariaLabel={`Opponent's deck (${opponent?.drawPileCount ?? 0} remaining)`}
        placement="opponent-draw"
        onClick={() => {}}
        disabled
      />
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
          onClick={() => {
            playButtonClickSound();
            setViewingCharacterCard('opponent');
          }}
        />
      )}
      <PlayerHand
        cards={hand}
        interactive={!isViewingDiscard && !isViewingDraw && !isViewingOpponentDiscard}
        // Unlike our own discard/draw previews, the opponent's discard
        // preview is read-only with nothing to drag in or out of — no
        // reason to force the hand open just because it's showing.
        forceOpen={isViewingDiscard || isViewingDraw}
        onDockOpenChange={setIsHandOpen}
        incomingCard={draggedCard && !hand.some((c) => c.id === draggedCard.id) ? draggedCard : undefined}
        onCardDragStart={handleCardDragStart}
        onCardDragEnd={() => {
          setIsDragActive(false);
          setDraggedCard(null);
        }}
        onReorder={(reordered) => send({ type: 'reorderHand', order: reordered.map((card) => card.id) })}
        onExternalDrop={handleDropOntoHand}
        onShowHand={() => {
          playButtonClickSound();
          setShowHandConfirm(true);
        }}
        showHandGlowRgb={characterGlowRgb(character.id)}
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
            playButtonClickSound();
            setIsViewingDraw(true);
            setIsViewingDiscard(false);
            setIsViewingOpponentDiscard(false);
          }}
          onShuffle={() => {
            playButtonClickSound();
            setShuffleConfirm('draw');
          }}
        />
      )}
      {/* Each character's own control, all sharing the one slot above their
          draw pile — only one can ever be on screen, since a player has only
          the one character. Each decides for itself when it's worth showing.

          Spike's goes away entirely once all three tokens are down: nothing
          removes a placed one, so the board's own count is how many he's spent. */}
      {character.id === 'spike' && state.darkness.length < SHADOW_TOKEN_LIMIT && (
        <CharacterActionButton
          characterId="spike"
          label={`Shadow Token (${SHADOW_TOKEN_LIMIT - state.darkness.length})`}
          onClick={() => send({ type: 'addDarkness' })}
        />
      )}
      {/* Willow's shows only while her minion is down, and goes on its own
          once it's back up — the opponent never gets to raise it. */}
      {character.id === 'willow' && deadMinionIndex !== -1 && (
        <CharacterActionButton
          characterId="willow"
          label="Resurrect"
          onClick={() => handleResurrectMinion(deadMinionIndex)}
        />
      )}
      {/* Squirrel Girl's counts down as she spawns: nothing removes a spawned
          minion, so — like the shadow tokens — her own coin count is exactly
          how many she's used, and it disappears once they're all out. */}
      {character.id === 'squirrelGirl' && spawnableMinionsLeft > 0 && (
        <CharacterActionButton
          characterId="squirrelGirl"
          label={`Squirrel (${spawnableMinionsLeft})`}
          onClick={() => {
            playSquirrelSqueakSound();
            send({ type: 'spawnMinion' });
          }}
        />
      )}
      {/* Sun Wukong's works the same way as Squirrel Girl's — the same action,
          just a smaller allowance — except each clone is torn off himself, so
          the server also docks his main coin a point of health (see
          minionSpawnSelfDamage) and both screens see the damage float off him. */}
      {character.id === 'sunWukong' && spawnableMinionsLeft > 0 && (
        <CharacterActionButton
          characterId="sunWukong"
          label={`Add clone (x${spawnableMinionsLeft})`}
          onClick={() => send({ type: 'spawnMinion' })}
        />
      )}
      {/* Yennenga's counts her *fallen* archers rather than a dwindling
          allowance — it appears as they die, ticks down as she brings them
          back one per click, and disappears once both are standing again.
          There's no limit over the game: it returns every time one falls. */}
      {character.id === 'yennenga' && deadMinionCount > 0 && (
        <CharacterActionButton
          characterId="yennenga"
          label={`Add archer (x${deadMinionCount})`}
          onClick={() => handleResurrectMinion(deadMinionIndex)}
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
            playButtonClickSound();
            setIsViewingDiscard(true);
            setIsViewingDraw(false);
            setIsViewingOpponentDiscard(false);
          }}
          onShuffle={() => {
            playButtonClickSound();
            setShuffleConfirm('discard');
          }}
        />
      )}
      <InfoButton
        placement="player"
        anchor={discardPile.length === 0 ? 'draw' : 'discard'}
        ariaLabel={`View ${character.name}'s character card`}
        onClick={() => {
          playButtonClickSound();
          setViewingCharacterCard('me');
        }}
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
      {isViewingDraw && (
        <div className={styles.pilePreview} onClick={() => setIsViewingDraw(false)}>
          {/* Unlike the discard preview below, shown in natural deck order,
              unreversed: drawPile[0] ("next to be drawn") reads as the
              backmost card in the fan, with the bottom of the deck
              frontmost. */}
          <PlayerHand
            cards={drawPile}
            variant="preview"
            onCardDragStart={handleCardDragStart}
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
            onCardDragStart={handleCardDragStart}
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
      {/* A hand the opponent chose to show us. Opens on arrival rather than
          waiting to be found, and dismissing it tells the server, so they
          can offer it again later. Read-only in exactly the same way as
          their discard pile above: look and zoom, nothing else. */}
      {revealedHand.length > 0 && (
        <div className={styles.pilePreview} onClick={() => send({ type: 'clearRevealedHand' })}>
          <PlayerHand cards={revealedHand} variant="preview" interactive={false} hoverOnly />
        </div>
      )}
      {/* Drawn under their cursor, so the two read as one gesture. A card
          the server didn't identify for us is one we aren't allowed to
          see, so it wears their card back. */}
      {opponent?.draggedCard && (
        <OpponentDraggedCard
          position={opponent.draggedCard}
          image={opponent.draggedCard.card ? toClientCard(opponent.draggedCard.card).image : opponentCardBack}
        />
      )}
      {opponent?.cursor && <OpponentCursor position={opponent.cursor} />}
      {draggedCard && <DragPreview card={draggedCard} centreOffset={draggedCardCentreOffset} />}
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
          onCancel={() => {
            playButtonClickSound();
            setShuffleConfirm(null);
          }}
        />
      )}
      {showHandConfirm && (
        <ConfirmDialog
          message="Are you sure you want to show your hand to the opponent?"
          confirmLabel="Show hand"
          onConfirm={() => {
            playButtonClickSound();
            send({ type: 'showHandToOpponent' });
            setShowHandConfirm(false);
          }}
          onCancel={() => {
            playButtonClickSound();
            setShowHandConfirm(false);
          }}
        />
      )}
      {viewingCharacterCard && (
        <CharacterCardDialog
          image={viewingCharacterCard === 'me' ? character.characterCard : (opponentCharacter?.characterCard ?? '')}
          characterName={viewingCharacterCard === 'me' ? character.name : (opponentCharacter?.name ?? '')}
          onClose={() => setViewingCharacterCard(null)}
        />
      )}
      {/* Keyed on the count, so each new dance mounts a fresh cat and replays
          its animation rather than leaving the last one sitting there spent.
          Only for dances set off since this board came on screen. */}
      {state.catDanceCount > initialCatDanceCount && <CatDance key={state.catDanceCount} />}
    </div>
  );
}

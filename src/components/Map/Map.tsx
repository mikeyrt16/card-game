import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { getCardBackImage, getCardImage, getCoinImage, hasCoinAltImage } from '../../data/assets';
import { characterGlowRgb } from '../../data/characterColors';
import type { CardData } from '../../data/cards';
import { BoardCard } from '../BoardCard/BoardCard';
import { CoinHealthChange } from '../CoinHealthChange/CoinHealthChange';
import { Darkness } from '../Darkness/Darkness';
import { draggedCardCentre } from '../DragPreview/draggedCardCentre';
import { HealthEditDialog } from '../HealthEditDialog/HealthEditDialog';
import type {
  BoardCardView,
  CoinState,
  CoinType,
  DarknessView,
  PlayerCoins,
  PlayerSlot,
} from '../../shared/protocol';
import styles from './Map.module.css';

const SLOTS: PlayerSlot[] = ['player1', 'player2'];

/** Stable identity for one coin — main plus each minion, both players' — used
 *  both as its React key and to remember things per coin between renders. */
function coinKey(owner: PlayerSlot, coinType: CoinType, minionIndex: number | undefined): string {
  return `${owner}-${coinType}-${minionIndex ?? 0}`;
}

/** Every coin's running count of health edits, keyed by `coinKey`. */
function healthEditCounts(coins: Record<PlayerSlot, PlayerCoins>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const owner of SLOTS) {
    counts[coinKey(owner, 'main', undefined)] = coins[owner].main.healthEditCount;
    coins[owner].minions.forEach((minion, i) => {
      counts[coinKey(owner, 'minion', i)] = minion.healthEditCount;
    });
  }
  return counts;
}

interface LocalDrag {
  owner: PlayerSlot;
  coinType: CoinType;
  /** Which minion coin, when coinType is 'minion' — undefined for 'main',
   *  which has exactly one instance. */
  minionIndex: number | undefined;
  x: number;
  y: number;
}

function sameCoin(
  a: LocalDrag | null,
  owner: PlayerSlot,
  coinType: CoinType,
  minionIndex: number | undefined,
): a is LocalDrag {
  return a !== null && a.owner === owner && a.coinType === coinType && a.minionIndex === minionIndex;
}

/** Which coin the health-edit dialog is currently open for — captured at
 *  double-click time rather than re-derived on every render, since the
 *  dialog needs a stable starting value even as the coin's live health
 *  keeps broadcasting in from the server while it's open. */
interface EditingCoin {
  owner: PlayerSlot;
  coinType: CoinType;
  minionIndex: number | undefined;
  label: string;
  health: number;
}

interface Size {
  width: number;
  height: number;
}

/** Describes exactly how the browser is rendering the background image
 *  under object-fit: cover — the underlying image is uniformly scaled up
 *  until it fully covers the container, then centered, cropping whatever
 *  overflows on the long axis. Coin x/y (0-100) are percentages of the
 *  image's *own* dimensions, not the container's — so this is what lets us
 *  convert between "a point on the image" and "a pixel in the container",
 *  which two viewers at different window sizes/aspect ratios would
 *  otherwise disagree on. */
function computeCoverGeometry(container: Size, image: Size) {
  const scale = Math.max(container.width / image.width, container.height / image.height);
  const renderedWidth = image.width * scale;
  const renderedHeight = image.height * scale;
  return {
    scale,
    offsetX: (renderedWidth - container.width) / 2,
    offsetY: (renderedHeight - container.height) / 2,
    renderedWidth,
    renderedHeight,
  };
}

function imagePercentToContainerPx(
  xPercent: number,
  yPercent: number,
  geometry: ReturnType<typeof computeCoverGeometry>,
): { x: number; y: number } {
  return {
    x: (xPercent / 100) * geometry.renderedWidth - geometry.offsetX,
    y: (yPercent / 100) * geometry.renderedHeight - geometry.offsetY,
  };
}

function containerPxToImagePercent(
  x: number,
  y: number,
  geometry: ReturnType<typeof computeCoverGeometry>,
): { x: number; y: number } {
  const xPercent = ((x + geometry.offsetX) / geometry.renderedWidth) * 100;
  const yPercent = ((y + geometry.offsetY) / geometry.renderedHeight) * 100;
  return { x: Math.max(0, Math.min(100, xPercent)), y: Math.max(0, Math.min(100, yPercent)) };
}

/** Coin positions are stored in one shared frame of reference that both
 *  players' servers and clients agree on — the *un-rotated* map. A player
 *  looking at the 180°-rotated art is seeing that same board from the far
 *  side, so a coin stored at "70% across, 20% down" sits, from where they
 *  are, 30% across and 80% down. Flipping both axes converts between the
 *  two, and since it's its own inverse the one function serves both
 *  directions: stored -> screen when rendering, screen -> stored when a
 *  drag reports a new position back. */
function toViewPercent(point: { x: number; y: number }, inverted: boolean): { x: number; y: number } {
  return inverted ? { x: 100 - point.x, y: 100 - point.y } : point;
}

interface MapProps {
  image: string;
  dimmed: boolean;
  /** True for the player shown the inverse (180°-rotated) map art. */
  inverted: boolean;
  coins: Record<PlayerSlot, PlayerCoins>;
  /** Cards lying on the map, both players'. */
  boardCards: BoardCardView[];
  /** Spike's shadow tokens. */
  darkness: DarknessView[];
  onMoveDarkness: (id: string, x: number, y: number) => void;
  mySlot: PlayerSlot;
  /** Which character each slot picked — null for a slot that hasn't (in
   *  practice always set once phase is 'playing', but guarded regardless). */
  characterIds: Record<PlayerSlot, string | null>;
  onCoinDragStart: (owner: PlayerSlot, coinType: CoinType, minionIndex: number | undefined) => void;
  onCoinMove: (owner: PlayerSlot, coinType: CoinType, minionIndex: number | undefined, x: number, y: number) => void;
  onCoinDragEnd: (owner: PlayerSlot, coinType: CoinType, minionIndex: number | undefined) => void;
  onUpdateCoinHealth: (owner: PlayerSlot, coinType: CoinType, minionIndex: number | undefined, health: number) => void;
  /** Shift + click on a coin with alt art — never sent otherwise. */
  onToggleCoinAltSide: (owner: PlayerSlot, coinType: CoinType, minionIndex: number | undefined) => void;
  /** A card was dropped on open board — either newly played out of a hand
   *  or pile, or one already lying here being slid somewhere else. */
  onDropCardOnBoard: (cardId: string, x: number, y: number) => void;
  onFlipBoardCard: (cardId: string) => void;
  onBoardCardDragStart: (card: CardData, centreOffset: { x: number; y: number }) => void;
  onBoardCardDragEnd: () => void;
  /** Set while a board card is mid-drag: the vector from the pointer to
   *  that card's centre, so releasing puts it down where it looks like it
   *  is rather than snapping its centre to the cursor. Null when the card
   *  being dragged came from a hand or pile. */
  draggedCardCentreOffset: { x: number; y: number } | null;
}

/** The game board: the map art itself, plus (increasingly) whatever lives on
 *  top of it — for now, each player's draggable main coin and however many
 *  minion coins their character has. */
export function Map({
  image,
  dimmed,
  inverted,
  coins,
  boardCards,
  darkness,
  onMoveDarkness,
  mySlot,
  characterIds,
  onCoinDragStart,
  onCoinMove,
  onCoinDragEnd,
  onUpdateCoinHealth,
  onToggleCoinAltSide,
  onDropCardOnBoard,
  onFlipBoardCard,
  onBoardCardDragStart,
  onBoardCardDragEnd,
  draggedCardCentreOffset,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [containerSize, setContainerSize] = useState<Size | null>(null);
  const [imageSize, setImageSize] = useState<Size | null>(null);
  // Local optimistic position for whichever coin *I'm* actively dragging —
  // otherwise every pixel of movement would wait a full server round-trip
  // before visually updating, which reads as laggy for continuous free-form
  // dragging (unlike the rest of the app's discrete click/drop actions).
  const [localDrag, setLocalDrag] = useState<LocalDrag | null>(null);
  // Coalesces rapid pointermove events into at most one moveCoin send per
  // animation frame, so local rendering stays perfectly smooth while
  // network traffic stays bounded.
  const rafRef = useRef<number | null>(null);
  const pendingMoveRef = useRef<LocalDrag | null>(null);
  // Where within the coin the pointer grabbed it (in image-percent units,
  // pointer position minus the coin's own position at pointerdown) — kept
  // constant for the drag's duration and subtracted back out on every move,
  // so the coin follows the pointer from wherever it was actually grabbed
  // instead of snapping its center to the pointer.
  const grabOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [editingCoin, setEditingCoin] = useState<EditingCoin | null>(null);
  // Each coin's edit count as it stood when this board first came on screen.
  // The floating number animates on being mounted, so without a baseline every
  // coin already carrying an edit would flash its last one on arrival — on a
  // mid-game refresh, say. Only counts that climb past this are edits that
  // happened while we were watching. Lazily initialised, so this is the state
  // at mount and never recomputed.
  const [initialHealthEditCounts] = useState(() => healthEditCounts(coins));
  // Which board card is in hand right now, so it can be hidden while the
  // drag preview stands in for it. Local to the map: it's purely about what
  // this screen draws, and it keeps the drag's start and end side by side.
  const [draggingBoardCardId, setDraggingBoardCardId] = useState<string | null>(null);
  // Where a card was just put down, drawn straight away instead of waiting
  // for the server to echo the move back. The drop fires before dragend
  // unhides the card, so it reappears already in its new place — without
  // this it would show at the old one for the length of the round trip.
  const [droppedCard, setDroppedCard] = useState<{ cardId: string; x: number; y: number } | null>(null);
  // Darkness is slid about exactly as the coins are: a local optimistic
  // position so it tracks the pointer without waiting on the server, and
  // its own throttle so a fast drag can't flood the socket.
  const [localDarknessDrag, setLocalDarknessDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const darknessGrabOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const darknessRafRef = useRef<number | null>(null);
  const pendingDarknessMoveRef = useRef<{ id: string; x: number; y: number } | null>(null);
  // Held until the server's own record of the card actually matches, rather
  // than merely until the next broadcast: broadcasts arrive constantly
  // mid-drag (every cursor update echoes back), so "the next one" is
  // routinely an unrelated message already in flight, and dropping the
  // optimistic position on it puts the card back at its old spot until the
  // real echo lands — which is the flicker. A card that's left the board
  // entirely — onto a pile, say — clears it too.
  useEffect(() => {
    if (!droppedCard) {
      return;
    }
    const confirmed = boardCards.find((boardCard) => boardCard.id === droppedCard.cardId);
    if (!confirmed || (confirmed.x === droppedCard.x && confirmed.y === droppedCard.y)) {
      setDroppedCard(null);
    }
  }, [boardCards, droppedCard]);

  // Re-measure the image's natural size whenever it changes (new map) —
  // cleared first so a stale geometry from the previous image can't briefly
  // misplace coins while the new one loads.
  useEffect(() => {
    setImageSize(null);
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    }
  }, [image]);

  // Tracks the container's rendered size live, so a browser/window resize
  // (different resolution, different aspect ratio) keeps coins visually
  // anchored to the same point on the image rather than the old box size.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const geometry =
    containerSize && imageSize && containerSize.width > 0 && containerSize.height > 0
      ? computeCoverGeometry(containerSize, imageSize)
      : null;

  /** Where the pointer is, in the shared (un-rotated) coordinates every
   *  coin position is stored in — so drags from either side of the board
   *  agree on where a coin ended up. */
  const toImagePercent = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !geometry) {
      return null;
    }
    return toViewPercent(containerPxToImagePercent(clientX - rect.left, clientY - rect.top, geometry), inverted);
  };

  const flushPendingMove = () => {
    rafRef.current = null;
    const pending = pendingMoveRef.current;
    if (pending) {
      onCoinMove(pending.owner, pending.coinType, pending.minionIndex, pending.x, pending.y);
    }
  };

  const flushPendingDarknessMove = () => {
    darknessRafRef.current = null;
    const pending = pendingDarknessMoveRef.current;
    if (pending) {
      onMoveDarkness(pending.id, pending.x, pending.y);
    }
  };

  const handleDarknessPointerDown = (patch: DarknessView) => (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = toImagePercent(e.clientX, e.clientY);
    darknessGrabOffsetRef.current = point ? { x: point.x - patch.x, y: point.y - patch.y } : { x: 0, y: 0 };
    // Stays put where it already is — no snap to the pointer on grab.
    setLocalDarknessDrag({ id: patch.id, x: patch.x, y: patch.y });
  };

  const handleDarknessPointerMove = (patch: DarknessView) => (e: ReactPointerEvent<HTMLDivElement>) => {
    if (localDarknessDrag?.id !== patch.id) {
      return;
    }
    const point = toImagePercent(e.clientX, e.clientY);
    if (!point) {
      return;
    }
    const offset = darknessGrabOffsetRef.current;
    const next = {
      id: patch.id,
      x: Math.max(0, Math.min(100, point.x - offset.x)),
      y: Math.max(0, Math.min(100, point.y - offset.y)),
    };
    setLocalDarknessDrag(next);
    pendingDarknessMoveRef.current = next;
    if (darknessRafRef.current === null) {
      darknessRafRef.current = requestAnimationFrame(flushPendingDarknessMove);
    }
  };

  const endDarknessDrag = (patch: DarknessView) => (e: ReactPointerEvent<HTMLDivElement>) => {
    if (localDarknessDrag?.id !== patch.id) {
      return;
    }
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (darknessRafRef.current !== null) {
      cancelAnimationFrame(darknessRafRef.current);
      darknessRafRef.current = null;
    }
    pendingDarknessMoveRef.current = null;
    setLocalDarknessDrag(null);
  };

  const handlePointerDown = (owner: PlayerSlot, coinType: CoinType, minionIndex: number | undefined, coin: CoinState) => (
    e: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (coin.health <= 0) {
      // Dead coins are visually removed (pointer-events: none handles the
      // common case) — belt-and-suspenders against any stray event.
      return;
    }
    if (coin.draggedBy && coin.draggedBy !== mySlot) {
      // Someone else already has it.
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = toImagePercent(e.clientX, e.clientY);
    grabOffsetRef.current = point ? { x: point.x - coin.x, y: point.y - coin.y } : { x: 0, y: 0 };
    // Stays put at the coin's actual current position — no snap on grab.
    setLocalDrag({ owner, coinType, minionIndex, x: coin.x, y: coin.y });
    onCoinDragStart(owner, coinType, minionIndex);
  };

  const handlePointerMove = (owner: PlayerSlot, coinType: CoinType, minionIndex: number | undefined) => (
    e: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (!sameCoin(localDrag, owner, coinType, minionIndex)) {
      return;
    }
    const point = toImagePercent(e.clientX, e.clientY);
    if (!point) {
      return;
    }
    const offset = grabOffsetRef.current;
    const next = {
      owner,
      coinType,
      minionIndex,
      x: Math.max(0, Math.min(100, point.x - offset.x)),
      y: Math.max(0, Math.min(100, point.y - offset.y)),
    };
    setLocalDrag(next);
    pendingMoveRef.current = next;
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(flushPendingMove);
    }
  };

  const endLocalDrag = (owner: PlayerSlot, coinType: CoinType, minionIndex: number | undefined) => (
    e: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (!sameCoin(localDrag, owner, coinType, minionIndex)) {
      return;
    }
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingMoveRef.current = null;
    setLocalDrag(null);
    onCoinDragEnd(owner, coinType, minionIndex);
  };

  /** Catches any card dropped on open board. The piles, their drop zones
   *  and the hand all sit outside this container in the DOM, so a drop they
   *  claimed never reaches here — which is what keeps them working exactly
   *  as before while everywhere else becomes droppable. */
  const handleBoardDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('text/plain');
    // Where the card's centre has actually been riding, not where the
    // pointer is. The two are far apart for a card out of a hand, which
    // hangs well below the cursor — dropping it at the pointer would land
    // it a long way above where it was shown.
    const centre = draggedCardCentre({ x: e.clientX, y: e.clientY }, draggedCardCentreOffset);
    const point = toImagePercent(centre.x, centre.y);
    if (cardId && point) {
      setDroppedCard({ cardId, x: point.x, y: point.y });
      onDropCardOnBoard(cardId, point.x, point.y);
    }
  };

  return (
    <div
      ref={containerRef}
      className={styles.container}
      // Without this the browser refuses the drop and the card springs back.
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleBoardDrop}
    >
      <img
        ref={imgRef}
        src={image}
        alt=""
        className={dimmed ? `${styles.background} ${styles.dimmed}` : styles.background}
        draggable={false}
        onLoad={(e) => {
          const img = e.currentTarget;
          setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
        }}
      />
      {/* Rendered before the coins and cards so it sits beneath them —
          darkness settles on the board, everything else sits on top. */}
      {geometry &&
        darkness.map((patch) => {
          const position = localDarknessDrag?.id === patch.id ? localDarknessDrag : patch;
          const view = toViewPercent(position, inverted);
          const { x: pxX, y: pxY } = imagePercentToContainerPx(view.x, view.y, geometry);

          return (
            <Darkness
              key={patch.id}
              left={pxX}
              top={pxY}
              onPointerDown={handleDarknessPointerDown(patch)}
              onPointerMove={handleDarknessPointerMove(patch)}
              onPointerUp={endDarknessDrag(patch)}
              onPointerCancel={endDarknessDrag(patch)}
            />
          );
        })}
      {geometry &&
        boardCards.map((boardCard) => {
          const ownerCharacterId = characterIds[boardCard.owner];
          if (!ownerCharacterId) {
            return null;
          }
          // Where we just put it, if the server hasn't caught up yet.
          const position = droppedCard?.cardId === boardCard.id ? droppedCard : boardCard;
          const view = toViewPercent(position, inverted);
          const { x: pxX, y: pxY } = imagePercentToContainerPx(view.x, view.y, geometry);
          const backImage = getCardBackImage(ownerCharacterId);
          const frontImage = boardCard.card
            ? getCardImage(boardCard.card.characterId, boardCard.card.slug)
            : null;
          const isMine = boardCard.owner === mySlot;

          return (
            <BoardCard
              key={boardCard.id}
              id={boardCard.id}
              left={pxX}
              top={pxY}
              faceUp={boardCard.faceUp}
              backImage={backImage}
              frontImage={frontImage}
              // Revealing is one-way, so a card that's already up offers no
              // double-click at all rather than one that does nothing.
              canFlip={isMine && !boardCard.faceUp}
              canDrag={isMine}
              isDragging={draggingBoardCardId === boardCard.id}
              onFlip={() => onFlipBoardCard(boardCard.id)}
              // What's dragged is whichever side is showing, so a card kept
              // face down stays face down in the preview too.
              onDragStart={(centreOffset) =>
                onBoardCardDragStart(
                  {
                    id: boardCard.id,
                    image: boardCard.faceUp && frontImage ? frontImage : backImage,
                  },
                  centreOffset,
                )
              }
              // Fires many times over; setting the same id again is a no-op,
              // so this settles after the first one.
              onDrag={() => setDraggingBoardCardId(boardCard.id)}
              onDragEnd={() => {
                setDraggingBoardCardId(null);
                onBoardCardDragEnd();
              }}
            />
          );
        })}
      {geometry &&
        SLOTS.map((owner) => {
          const characterId = characterIds[owner];
          if (!characterId) {
            return null;
          }
          const playerCoins = coins[owner];
          const glowRgb = characterGlowRgb(characterId);
          // One entry for the main coin, then one per minion coin — however
          // many that character has (see CharacterDef.minionCount) — so a
          // single list drives the render below regardless of count.
          const coinEntries: { coinType: CoinType; minionIndex: number | undefined; coin: CoinState }[] = [
            { coinType: 'main', minionIndex: undefined, coin: playerCoins.main },
            ...playerCoins.minions.map((coin, minionIndex) => ({ coinType: 'minion' as const, minionIndex, coin })),
          ];

          return coinEntries.map(({ coinType, minionIndex, coin }) => {
            const position = sameCoin(localDrag, owner, coinType, minionIndex) ? localDrag : coin;
            // Stored coordinates are shared; turn them into this viewer's
            // own orientation before placing anything on screen.
            const view = toViewPercent(position, inverted);
            const { x: pxX, y: pxY } = imagePercentToContainerPx(view.x, view.y, geometry);
            const isDead = coin.health <= 0;
            const isGlowing = Boolean(coin.draggedBy);
            const isGrabbable = !isDead && (!coin.draggedBy || coin.draggedBy === mySlot);
            const ownerLabel = owner === mySlot ? 'Your' : "Opponent's";
            const coinLabel =
              minionIndex !== undefined && playerCoins.minions.length > 1 ? `minion ${minionIndex + 1}` : coinType;
            const hasAlt = hasCoinAltImage(characterId, coinType);
            // Squirrel Girl's minions render at half size — she can end up
            // with up to SQUIRREL_GIRL_MINION_LIMIT of them, unlike every
            // other character's one or few, so they read as a swarm rather
            // than crowding the board at full coin size.
            const isSmall = coinType === 'minion' && characterId === 'squirrelGirl';
            const key = coinKey(owner, coinType, minionIndex);
            // Shown only for an edit made since this board came on screen. A
            // coin that's only just appeared (a spawned squirrel) has no
            // baseline, and starts on 0 edits anyway.
            const showHealthChange = coin.healthEditCount > (initialHealthEditCounts[key] ?? 0);

            return (
              <Fragment key={key}>
                <button
                  type="button"
                  className={[
                    styles.coin,
                    isSmall && styles.coinSmall,
                    isGlowing && styles.coinGlowing,
                    isDead && styles.coinDead,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={
                    {
                      left: `${pxX}px`,
                      top: `${pxY}px`,
                      cursor: isGrabbable ? 'grab' : 'default',
                      '--glow-rgb': glowRgb,
                    } as CSSProperties
                  }
                  onPointerDown={handlePointerDown(owner, coinType, minionIndex, coin)}
                  onPointerMove={handlePointerMove(owner, coinType, minionIndex)}
                  onPointerUp={endLocalDrag(owner, coinType, minionIndex)}
                  onPointerCancel={endLocalDrag(owner, coinType, minionIndex)}
                  onClick={(e) => {
                    // Shift + click is reserved for the alt-side flip — a
                    // no-op for a coin with no alt art to flip to.
                    if (e.shiftKey && hasAlt) {
                      onToggleCoinAltSide(owner, coinType, minionIndex);
                    }
                  }}
                  onDoubleClick={(e) => {
                    // Shift is reserved for the click-based flip above — a
                    // shift + double-click (two shift-clicks in quick
                    // succession) must never also open the health dialog.
                    if (e.shiftKey) {
                      return;
                    }
                    setEditingCoin({ owner, coinType, minionIndex, label: `${ownerLabel} ${coinLabel}`, health: coin.health });
                  }}
                  aria-label={`${ownerLabel} ${coinLabel} coin`}
                >
                  {hasAlt ? (
                    <div className={coin.altSide ? `${styles.coinInner} ${styles.coinFlipped}` : styles.coinInner}>
                      <img
                        src={getCoinImage(characterId, coinType)}
                        alt=""
                        className={styles.coinFace}
                        draggable={false}
                      />
                      <img
                        src={getCoinImage(characterId, coinType, 'alt')}
                        alt=""
                        className={`${styles.coinFace} ${styles.coinFaceAlt}`}
                        draggable={false}
                      />
                    </div>
                  ) : (
                    <img
                      src={getCoinImage(characterId, coinType)}
                      alt=""
                      className={styles.coinImage}
                      draggable={false}
                    />
                  )}
                </button>
                <div
                  className={isSmall ? `${styles.healthBadge} ${styles.healthBadgeSmall}` : styles.healthBadge}
                  style={{ left: `${pxX}px`, top: `${pxY}px` }}
                  aria-hidden="true"
                >
                  {coin.health}
                </div>
                {/* Keyed on the edit count, so each new edit mounts a fresh one
                    and replays its animation rather than leaving the last one
                    sitting there spent. */}
                {showHealthChange && (
                  <CoinHealthChange key={coin.healthEditCount} delta={coin.healthEditDelta} left={pxX} top={pxY} />
                )}
              </Fragment>
            );
          });
        })}
      {editingCoin && (
        <HealthEditDialog
          label={editingCoin.label}
          currentHealth={editingCoin.health}
          onUpdate={(health) => {
            onUpdateCoinHealth(editingCoin.owner, editingCoin.coinType, editingCoin.minionIndex, health);
            setEditingCoin(null);
          }}
          onCancel={() => setEditingCoin(null)}
        />
      )}
    </div>
  );
}

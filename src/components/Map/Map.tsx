import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { getCoinImage } from '../../data/assets';
import type { CoinState, CoinType, PlayerSlot } from '../../shared/protocol';
import styles from './Map.module.css';

const SLOTS: PlayerSlot[] = ['player1', 'player2'];
const COIN_TYPES: CoinType[] = ['main', 'minion'];

interface LocalDrag {
  owner: PlayerSlot;
  coinType: CoinType;
  x: number;
  y: number;
}

interface MapProps {
  image: string;
  dimmed: boolean;
  coins: Record<PlayerSlot, Record<CoinType, CoinState>>;
  mySlot: PlayerSlot;
  /** Which character each slot picked — null for a slot that hasn't (in
   *  practice always set once phase is 'playing', but guarded regardless). */
  characterIds: Record<PlayerSlot, string | null>;
  onCoinDragStart: (owner: PlayerSlot, coinType: CoinType) => void;
  onCoinMove: (owner: PlayerSlot, coinType: CoinType, x: number, y: number) => void;
  onCoinDragEnd: (owner: PlayerSlot, coinType: CoinType) => void;
}

/** The game board: the map art itself, plus (increasingly) whatever lives on
 *  top of it — for now, each player's draggable main/minion coins. */
export function Map({ image, dimmed, coins, mySlot, characterIds, onCoinDragStart, onCoinMove, onCoinDragEnd }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
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

  const toPercent = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) {
      return null;
    }
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  };

  const flushPendingMove = () => {
    rafRef.current = null;
    const pending = pendingMoveRef.current;
    if (pending) {
      onCoinMove(pending.owner, pending.coinType, pending.x, pending.y);
    }
  };

  const handlePointerDown = (owner: PlayerSlot, coinType: CoinType, coin: CoinState) => (
    e: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (coin.draggedBy && coin.draggedBy !== mySlot) {
      // Someone else already has it.
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = toPercent(e.clientX, e.clientY) ?? { x: coin.x, y: coin.y };
    setLocalDrag({ owner, coinType, ...point });
    onCoinDragStart(owner, coinType);
  };

  const handlePointerMove = (owner: PlayerSlot, coinType: CoinType) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!localDrag || localDrag.owner !== owner || localDrag.coinType !== coinType) {
      return;
    }
    const point = toPercent(e.clientX, e.clientY);
    if (!point) {
      return;
    }
    const next = { owner, coinType, ...point };
    setLocalDrag(next);
    pendingMoveRef.current = next;
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(flushPendingMove);
    }
  };

  const endLocalDrag = (owner: PlayerSlot, coinType: CoinType) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!localDrag || localDrag.owner !== owner || localDrag.coinType !== coinType) {
      return;
    }
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingMoveRef.current = null;
    setLocalDrag(null);
    onCoinDragEnd(owner, coinType);
  };

  return (
    <div ref={containerRef} className={styles.container}>
      <img
        src={image}
        alt=""
        className={dimmed ? `${styles.background} ${styles.dimmed}` : styles.background}
        draggable={false}
      />
      {SLOTS.map((owner) =>
        COIN_TYPES.map((coinType) => {
          const characterId = characterIds[owner];
          if (!characterId) {
            return null;
          }
          const coin = coins[owner][coinType];
          const isLocallyDragging = localDrag?.owner === owner && localDrag.coinType === coinType;
          const position = isLocallyDragging ? localDrag : coin;
          const isGlowing = Boolean(coin.draggedBy);
          const isGrabbable = !coin.draggedBy || coin.draggedBy === mySlot;
          const ownerLabel = owner === mySlot ? 'Your' : "Opponent's";

          return (
            <button
              key={`${owner}-${coinType}`}
              type="button"
              className={[styles.coin, coinType === 'minion' && styles.coinMinion, isGlowing && styles.coinGlowing]
                .filter(Boolean)
                .join(' ')}
              style={{ left: `${position.x}%`, top: `${position.y}%`, cursor: isGrabbable ? 'grab' : 'default' }}
              onPointerDown={handlePointerDown(owner, coinType, coin)}
              onPointerMove={handlePointerMove(owner, coinType)}
              onPointerUp={endLocalDrag(owner, coinType)}
              onPointerCancel={endLocalDrag(owner, coinType)}
              aria-label={`${ownerLabel} ${coinType} coin`}
            >
              <img src={getCoinImage(characterId, coinType)} alt="" className={styles.coinImage} draggable={false} />
            </button>
          );
        }),
      )}
    </div>
  );
}

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
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

  const toImagePercent = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !geometry) {
      return null;
    }
    return containerPxToImagePercent(clientX - rect.left, clientY - rect.top, geometry);
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
    const point = toImagePercent(e.clientX, e.clientY) ?? { x: coin.x, y: coin.y };
    setLocalDrag({ owner, coinType, ...point });
    onCoinDragStart(owner, coinType);
  };

  const handlePointerMove = (owner: PlayerSlot, coinType: CoinType) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!localDrag || localDrag.owner !== owner || localDrag.coinType !== coinType) {
      return;
    }
    const point = toImagePercent(e.clientX, e.clientY);
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
      {geometry &&
        SLOTS.map((owner) =>
          COIN_TYPES.map((coinType) => {
            const characterId = characterIds[owner];
            if (!characterId) {
              return null;
            }
            const coin = coins[owner][coinType];
            const isLocallyDragging = localDrag?.owner === owner && localDrag.coinType === coinType;
            const position = isLocallyDragging ? localDrag : coin;
            const { x: pxX, y: pxY } = imagePercentToContainerPx(position.x, position.y, geometry);
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
                style={{ left: `${pxX}px`, top: `${pxY}px`, cursor: isGrabbable ? 'grab' : 'default' }}
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

import { Fragment, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { getCoinImage } from '../../data/assets';
import type { CoinState, CoinType, PlayerCoins, PlayerSlot } from '../../shared/protocol';
import styles from './Map.module.css';

const SLOTS: PlayerSlot[] = ['player1', 'player2'];

/** Each character's particle fountain is tinted to match them, rather than
 *  a fixed ally/enemy palette — so it reads as "this is Medusa's fountain"
 *  regardless of which player is controlling her. Falls back to the
 *  original gold if an unknown characterId ever slips through. */
const CHARACTER_PARTICLE_COLORS: Record<string, string> = {
  medusa: '#6FCF52',
  arthur: '#FF6F5E',
  alice: '#4FC3FF',
  sinbad: '#F7932D',
};
const DEFAULT_PARTICLE_COLOR = '#FFD54A';

function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** Derives the particle gradient's three stops from one character color:
 *  a near-white core (particles read as glowing hot at their center,
 *  whatever the hue), the character color itself as the mid stop, and a
 *  fully-transparent version of it for the fade-out edge. */
function buildParticlePalette(characterId: string | null): { core: string; mid: string; fade: string } {
  const hex = (characterId && CHARACTER_PARTICLE_COLORS[characterId]) || DEFAULT_PARTICLE_COLOR;
  const [r, g, b] = hexToRgb(hex);
  const core = `rgb(${Math.round(r + (255 - r) * 0.8)}, ${Math.round(g + (255 - g) * 0.8)}, ${Math.round(b + (255 - b) * 0.8)})`;
  return { core, mid: hex, fade: `rgba(${r}, ${g}, ${b}, 0)` };
}

/** The "picked up" glow's color, as a space-separated "R G B" triple for
 *  CSS's `rgb(var(--glow-rgb) / <alpha>)` syntax — same source color as
 *  that character's particle fountain (buildParticlePalette's `mid`). */
function characterGlowRgb(characterId: string | null): string {
  const hex = (characterId && CHARACTER_PARTICLE_COLORS[characterId]) || DEFAULT_PARTICLE_COLOR;
  return hexToRgb(hex).join(' ');
}

/** Per-coin-type fountain tuning. Minion coins are visually smaller (76px
 *  vs. main's 101px, ~75% the size), so an equally-intense fountain would
 *  *read* as weaker next to the bigger main coin — minion's numbers here
 *  are boosted proportionally harder than main's (bigger relative jump in
 *  count, size, opacity, and rate) so the two feel comparably intense
 *  despite the size gap. Higher count + shorter duration both raise the
 *  effective emission rate (roughly count / duration particles-equivalent
 *  per second), since each particle re-loops that often.
 *
 *  `distance` must clear the coin's own radius (main: 101px wide → 50.5px
 *  radius; minion: 76px → 38px) by a healthy margin — particles originate
 *  at dead center behind the coin (z-index below it), so anything that
 *  never travels past the radius spends its entire life hidden underneath
 *  the opaque coin and is never actually seen. */
const PARTICLE_CONFIG: Record<
  CoinType,
  { count: number; distance: number; size: number; peakOpacity: number; durationSeconds: number }
> = {
  main: { count: 192, distance: 100, size: 16, peakOpacity: 1, durationSeconds: 2.0 },
  minion: { count: 136, distance: 72, size: 13, peakOpacity: 0.95, durationSeconds: 1.4 },
};

/** Deterministic pseudo-random in [0, 1), seeded by an arbitrary number —
 *  used instead of Math.random() so the pattern is stable across renders
 *  (computed once at module load below) rather than reshuffling itself.
 *  Different seeds per property (angle/distance/delay all use a different
 *  multiplier+offset off the same particle index) keep them decorrelated
 *  from each other. */
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** Generates one fountain's worth of particle styles for a coin type. Pure
 *  function of coinType, computed once at module load (below) rather than
 *  per render — there's nothing per-instance to vary, since both players'
 *  coins of the same type share the same fountain pattern. */
function buildParticles(coinType: CoinType): CSSProperties[] {
  const { count, distance, size, peakOpacity, durationSeconds } = PARTICLE_CONFIG[coinType];
  return Array.from({ length: count }, (_, i) => {
    // Fully random angle around the full circle. Deliberately *not*
    // derived from the same even progression as the delay below (e.g.
    // evenly-spaced angle paired with evenly-staggered delay) — that
    // combination made the burst read as a rotating "spinning" sweep
    // instead of a random scatter, since direction and emission order
    // were correlated.
    const angleRad = pseudoRandom(i * 3.1 + 0.17) * 2 * Math.PI;
    const particleDistance = distance * (0.7 + 0.5 * pseudoRandom(i * 7.7 + 1.9));
    const tx = Math.cos(angleRad) * particleDistance;
    const ty = Math.sin(angleRad) * particleDistance;
    // Every particle sharing one exact duration, evenly staggered by index,
    // makes the whole fountain a perfectly periodic signal — at high counts
    // with a short base duration (minion) that period gets short enough to
    // beat against the display's frame rate, which reads as a visible
    // pulse rather than a steady stream. Jittering each particle's own
    // duration slightly desynchronizes the population so no single beat
    // frequency dominates.
    const particleDuration = durationSeconds * (0.82 + 0.36 * pseudoRandom(i * 5.3 + 3.7));
    const delaySeconds = -((i / count) * particleDuration);
    return {
      '--tx': `${tx.toFixed(1)}px`,
      '--ty': `${ty.toFixed(1)}px`,
      '--size': `${size}px`,
      '--peak-opacity': peakOpacity,
      '--duration': `${particleDuration.toFixed(3)}s`,
      animationDelay: `${delaySeconds}s`,
    } as CSSProperties;
  });
}

const PARTICLES_BY_COIN_TYPE: Record<CoinType, CSSProperties[]> = {
  main: buildParticles('main'),
  minion: buildParticles('minion'),
};

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
  coins: Record<PlayerSlot, PlayerCoins>;
  mySlot: PlayerSlot;
  /** Which character each slot picked — null for a slot that hasn't (in
   *  practice always set once phase is 'playing', but guarded regardless). */
  characterIds: Record<PlayerSlot, string | null>;
  onCoinDragStart: (owner: PlayerSlot, coinType: CoinType, minionIndex: number | undefined) => void;
  onCoinMove: (owner: PlayerSlot, coinType: CoinType, minionIndex: number | undefined, x: number, y: number) => void;
  onCoinDragEnd: (owner: PlayerSlot, coinType: CoinType, minionIndex: number | undefined) => void;
}

/** The game board: the map art itself, plus (increasingly) whatever lives on
 *  top of it — for now, each player's draggable main coin and however many
 *  minion coins their character has. */
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
      onCoinMove(pending.owner, pending.coinType, pending.minionIndex, pending.x, pending.y);
    }
  };

  const handlePointerDown = (owner: PlayerSlot, coinType: CoinType, minionIndex: number | undefined, coin: CoinState) => (
    e: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (coin.draggedBy && coin.draggedBy !== mySlot) {
      // Someone else already has it.
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = toImagePercent(e.clientX, e.clientY) ?? { x: coin.x, y: coin.y };
    setLocalDrag({ owner, coinType, minionIndex, ...point });
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
    const next = { owner, coinType, minionIndex, ...point };
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
        SLOTS.map((owner) => {
          const characterId = characterIds[owner];
          if (!characterId) {
            return null;
          }
          const playerCoins = coins[owner];
          const particlePalette = buildParticlePalette(characterId);
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
            const { x: pxX, y: pxY } = imagePercentToContainerPx(position.x, position.y, geometry);
            const isGlowing = Boolean(coin.draggedBy);
            const isGrabbable = !coin.draggedBy || coin.draggedBy === mySlot;
            const ownerLabel = owner === mySlot ? 'Your' : "Opponent's";
            const coinLabel =
              minionIndex !== undefined && playerCoins.minions.length > 1 ? `minion ${minionIndex + 1}` : coinType;

            return (
              <Fragment key={`${owner}-${coinType}-${minionIndex ?? 0}`}>
                <div
                  className={styles.particleField}
                  style={
                    {
                      left: `${pxX}px`,
                      top: `${pxY}px`,
                      '--particle-core': particlePalette.core,
                      '--particle-mid': particlePalette.mid,
                      '--particle-fade': particlePalette.fade,
                    } as CSSProperties
                  }
                  aria-hidden="true"
                >
                  {PARTICLES_BY_COIN_TYPE[coinType].map((particleStyle, i) => (
                    <span key={i} className={styles.particle} style={particleStyle} />
                  ))}
                </div>
                <button
                  type="button"
                  className={[
                    styles.coin,
                    coinType === 'minion' && styles.coinMinion,
                    isGlowing && styles.coinGlowing,
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
                  aria-label={`${ownerLabel} ${coinLabel} coin`}
                >
                  <img
                    src={getCoinImage(characterId, coinType)}
                    alt=""
                    className={styles.coinImage}
                    draggable={false}
                  />
                </button>
              </Fragment>
            );
          });
        })}
    </div>
  );
}

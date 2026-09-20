import { useEffect, useRef, useState, type CSSProperties, type DragEvent } from 'react';
import type { CardData } from '../../data/cards';
import styles from './PlayerHand.module.css';

interface PlayerHandProps {
  cards: CardData[];
  /** 'hand' (default) anchors to the bottom of the screen; 'preview' centers
   *  it, for showing a fanned-out read of a non-hand pile (e.g. discard);
   *  'opponent' anchors to the top of the screen, rotated 180deg. */
  variant?: 'hand' | 'preview' | 'opponent';
  /** When false, cards can't be hovered/focused or dragged — the hand stays
   *  a valid drop target but is otherwise inert. Default true. */
  interactive?: boolean;
  /** Only meaningful for variant 'hand': keeps the auto-hide dock raised
   *  regardless of hover — e.g. while a pile preview is open and this hand
   *  still needs to be visible/usable as a drop target. Default false. */
  forceOpen?: boolean;
  /** Only meaningful for variant 'hand': fires whenever the auto-hide
   *  dock's raised/lowered state changes. */
  onDockOpenChange?: (isOpen: boolean) => void;
  /** A card currently being dragged in from elsewhere (not already part of
   *  `cards`) — shown as a live preview inserted wherever it's hovered.
   *  Committing it still happens via onExternalDrop. */
  incomingCard?: CardData | null;
  onCardDragStart?: (card: CardData) => void;
  onCardDragEnd?: () => void;
  onReorder?: (reordered: CardData[]) => void;
  /** Called when a card not already among `cards` is dropped anywhere on
   *  this hand (e.g. dragged in from a discard-pile preview). `index` is
   *  where in `cards` it was hovered when dropped. */
  onExternalDrop?: (cardId: string, index: number) => void;
}

function reorder(cards: CardData[], fromId: string, toId: string): CardData[] {
  const fromIndex = cards.findIndex((c) => c.id === fromId);
  const toIndex = cards.findIndex((c) => c.id === toId);
  if (fromIndex === -1 || toIndex === -1) {
    return cards;
  }
  const next = [...cards];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

const MAX_ROTATION_DEG = 7;
const MAX_ARC_RISE_PX = 30;
const CARD_WIDTH_PX = 160;
const CARD_ASPECT_RATIO = 349 / 250;
const MAX_HAND_WIDTH_PX = 1000;
const BASE_CARD_SPACING_PX = 68;
const DRAG_PREVIEW_SCALE = 1.5;

export function PlayerHand({
  cards,
  variant = 'hand',
  interactive = true,
  forceOpen = false,
  onDockOpenChange,
  incomingCard,
  onCardDragStart,
  onCardDragEnd,
  onReorder,
  onExternalDrop,
}: PlayerHandProps) {
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  // Which other card the pointer is currently over — a live preview only,
  // not committed until an actual drop. Computed from the pointer's raw
  // position against `cards`' *static* geometry (see handleDragOver), never
  // from hit-testing the live-shuffled DOM: reacting to elements that move
  // as a direct result of this same state update creates a feedback loop
  // (hovering a card moves it away from the pointer, which un-hovers it,
  // which moves it back, forever) — pure position math has no such loop.
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  // True once the pointer has actually left this fan's own bounding box
  // during a drag of one of its own cards (set only by handleDragLeave,
  // cleared by handleDragOver). Deliberately NOT derived from
  // `dragOverCardId === null`: that's also true for the single synchronous
  // render right after dragStart, before the browser's first dragover
  // fires — hiding the card there would unmount its own DOM node (the
  // native drag source) mid-dragstart, which silently aborts the entire
  // native drag (no ghost image, no further dragover/drop at all).
  const [isDraggedAway, setIsDraggedAway] = useState(false);
  // True only while the pointer is actually over *this* container during an
  // incoming (cross-instance) drag — set by handleDragOver, cleared by
  // handleDragLeave. `incomingCard` alone isn't enough to gate the preview
  // below: it's set the instant a drag starts on *either* PlayerHand
  // instance (the dragged card is lifted to shared state in GameRoute so
  // dataTransfer's payload can't be relied on mid-drag), so without this a
  // card merely being reordered within the discard preview would also
  // splice a ghost copy into the real hand the whole time, never having
  // been anywhere near it.
  const [isIncomingHovered, setIsIncomingHovered] = useState(false);
  // Where an incoming (cross-instance) card would land if dropped right
  // now — an index into `cards`, computed the same way as dragOverCardId
  // (pure position math against static geometry), just expressed as an
  // insertion point rather than a swap target since the card isn't
  // actually part of `cards` yet.
  const [incomingInsertIndex, setIncomingInsertIndex] = useState<number | null>(null);
  // Auto-hide dock (variant 'hand' only): the fan sits lowered out of the
  // way by default, and rises to its normal position while the pointer is
  // over either this fan or the separate bottom-center hitzone rendered
  // below. Tracked as two independent booleans (rather than one flag both
  // regions flip) so moving from one region straight into the other never
  // has a spurious closed frame in between.
  const [isHoveringDockZone, setIsHoveringDockZone] = useState(false);
  const [isHoveringHandArea, setIsHoveringHandArea] = useState(false);
  const handRef = useRef<HTMLDivElement>(null);

  // A drop onto an external target (discard pile, draw pile, play zone —
  // anything outside this component's own container) unmounts the dragged
  // card's slot the instant `cards` no longer contains it, which happens
  // *before* the browser gets a chance to fire the native dragend that
  // would otherwise reset draggedCardId below — an element that's already
  // gone from the DOM never receives it. Rather than reset that state
  // imperatively (which needs an effect, and so an extra render), just
  // derive "is the card I started dragging still actually here" on every
  // render — a stale id from a vanished card is then ignored everywhere
  // below without waiting for anything to catch the unmount.
  const effectiveDraggedCardId = draggedCardId && cards.some((c) => c.id === draggedCardId) ? draggedCardId : null;

  // Backstop for the *other* timing outcome of the same unmount-before-
  // dragend gap: the onDragEnd handler below already force-clears the two
  // dock-open hover flags when a drop leaves the hand, but only covers the
  // case where dragend actually fires. When it doesn't (the dropped card's
  // slot unmounts before the browser gets a chance to dispatch it — see
  // that handler's own comment), draggedCardId is left stuck at the old
  // card's id with nothing to ever clear it via the normal path. Detecting
  // "we were tracking a drag and it just vanished from `cards`" here
  // catches exactly that case and performs the same cleanup, so the dock
  // reliably closes either way dragend happens to resolve.
  useEffect(() => {
    if (draggedCardId && !effectiveDraggedCardId) {
      setIsHoveringHandArea(false);
      setIsHoveringDockZone(false);
      setDraggedCardId(null);
    }
  }, [draggedCardId, effectiveDraggedCardId]);

  let displayCards = cards;
  if (effectiveDraggedCardId && isDraggedAway) {
    // e.g. dragging a discard-preview card toward the hand. Hide it here so
    // it doesn't render in both places at once; it reappears if the drag
    // returns to this fan.
    displayCards = cards.filter((c) => c.id !== effectiveDraggedCardId);
  } else if (effectiveDraggedCardId && dragOverCardId && dragOverCardId !== effectiveDraggedCardId) {
    displayCards = reorder(cards, effectiveDraggedCardId, dragOverCardId);
  } else if (incomingCard && isIncomingHovered) {
    const index = incomingInsertIndex ?? cards.length;
    displayCards = [...cards.slice(0, index), incomingCard, ...cards.slice(index)];
  }

  const center = (displayCards.length - 1) / 2;
  const cardSpacing =
    displayCards.length > 1
      ? Math.min(BASE_CARD_SPACING_PX, (MAX_HAND_WIDTH_PX - CARD_WIDTH_PX) / (displayCards.length - 1))
      : BASE_CARD_SPACING_PX;

  // Static reference geometry for hit-testing, based on the committed
  // `cards` (never `displayCards`) so it can't shift mid-drag.
  const staticCenter = (cards.length - 1) / 2;
  const staticCardSpacing =
    cards.length > 1
      ? Math.min(BASE_CARD_SPACING_PX, (MAX_HAND_WIDTH_PX - CARD_WIDTH_PX) / (cards.length - 1))
      : BASE_CARD_SPACING_PX;

  const handVariantClass =
    variant === 'preview' ? styles.handPreview : variant === 'opponent' ? styles.handOpponent : '';
  const handClassName = `${styles.hand} ${handVariantClass}`.trim();
  const canReceiveDrag = Boolean(effectiveDraggedCardId) || Boolean(incomingCard);

  const isDockedHand = variant === 'hand';
  // Also stays raised mid-drag — a card of ours being dragged, or one being
  // dragged in from elsewhere — so the fan doesn't sink away out from under
  // an in-progress drag just because native drag-and-drop can make regular
  // mouseenter/mouseleave fire inconsistently while it's active.
  const isDockOpen =
    !isDockedHand ||
    forceOpen ||
    isHoveringDockZone ||
    isHoveringHandArea ||
    Boolean(effectiveDraggedCardId) ||
    isIncomingHovered;

  useEffect(() => {
    if (isDockedHand) {
      onDockOpenChange?.(isDockOpen);
    }
  }, [isDockedHand, isDockOpen, onDockOpenChange]);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!canReceiveDrag) {
      return;
    }
    e.preventDefault();
    const rect = handRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    setIsDraggedAway(false);
    setIsIncomingHovered(true);
    const relativeX = e.clientX - (rect.left + rect.width / 2);

    if (effectiveDraggedCardId) {
      let closestId: string | null = null;
      let closestDistance = Infinity;
      // The dragged card's own original slot is a valid target too — hovering
      // it sets dragOverCardId === draggedCardId, which the display logic
      // below already treats as "no swap". Excluding it here would leave a
      // gap in the fan the pointer could never actually land on.
      cards.forEach((c, i) => {
        const expectedX = (i - staticCenter) * staticCardSpacing;
        const distance = Math.abs(expectedX - relativeX);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestId = c.id;
        }
      });
      setDragOverCardId(closestId);
    } else if (incomingCard) {
      // Count how many existing cards sit left of the pointer — that's the
      // index the incoming card would land at if dropped here.
      let index = 0;
      cards.forEach((_, i) => {
        const expectedX = (i - staticCenter) * staticCardSpacing;
        if (expectedX < relativeX) {
          index = i + 1;
        }
      });
      setIncomingInsertIndex(index);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    if (!canReceiveDrag) {
      return;
    }
    e.preventDefault();
    if (effectiveDraggedCardId && dragOverCardId && dragOverCardId !== effectiveDraggedCardId) {
      onReorder?.(reorder(cards, effectiveDraggedCardId, dragOverCardId));
    } else if (incomingCard) {
      const cardId = e.dataTransfer.getData('text/plain');
      if (cardId) {
        onExternalDrop?.(cardId, incomingInsertIndex ?? cards.length);
      }
    }
    setDragOverCardId(null);
    setIsIncomingHovered(false);
    setIncomingInsertIndex(null);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    // dragenter/dragleave behave like mouseover/mouseout (they fire when
    // crossing into/out of a descendant too), so only reset when truly
    // leaving the hand's own bounding box.
    const related = e.relatedTarget as Node | null;
    if (!related || !e.currentTarget.contains(related)) {
      setDragOverCardId(null);
      setIsIncomingHovered(false);
      setIncomingInsertIndex(null);
      if (effectiveDraggedCardId) {
        setIsDraggedAway(true);
      }
    }
  };

  return (
    <>
      <div
        ref={handRef}
        className={handClassName}
        style={isDockedHand ? { transform: isDockOpen ? 'translateY(0)' : 'translateY(150px)' } : undefined}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragLeave={handleDragLeave}
        onMouseEnter={isDockedHand ? () => setIsHoveringHandArea(true) : undefined}
        onMouseLeave={isDockedHand ? () => setIsHoveringHandArea(false) : undefined}
      >
        {/* Invisible native drag sources — one per card actually in `cards`,
            positioned from the static (never-reordered-for-preview) geometry.
            Kept as a list separate from the visual fan below and keyed
            identically to it, so a card's own drag-source node is never
            unmounted mid-gesture just because the *visual* layer hid or
            reordered it elsewhere (e.g. isDraggedAway closing the fan's gap).
            Losing that mount would mean the browser can never fire this
            card's dragend again — dropped somewhere that doesn't handle it,
            it would stay invisible forever instead of snapping back. */}
        {cards.map((card, i) => {
          const offset = i - staticCenter;
          const normalized = staticCenter > 0 ? offset / staticCenter : 0;
          const positionStyle = {
            '--rotate': `${normalized * MAX_ROTATION_DEG}deg`,
            '--translate-x': `${offset * staticCardSpacing}px`,
            '--translate-y': `${normalized * normalized * MAX_ARC_RISE_PX}px`,
          } as CSSProperties;
  
          return (
            <div
              key={card.id}
              className={styles.slot}
              style={{ ...positionStyle, zIndex: i, pointerEvents: interactive ? undefined : 'none' }}
              draggable={interactive}
              onDragStart={
                interactive
                  ? (e) => {
                      e.dataTransfer.setData('text/plain', card.id);
                      e.dataTransfer.effectAllowed = 'move';
  
                      const width = CARD_WIDTH_PX * DRAG_PREVIEW_SCALE;
                      const height = width * CARD_ASPECT_RATIO;
                      const ghost = document.createElement('img');
                      ghost.src = card.image;
                      ghost.style.position = 'fixed';
                      ghost.style.top = '-9999px';
                      ghost.style.left = '-9999px';
                      ghost.style.width = `${width}px`;
                      ghost.style.height = `${height}px`;
                      ghost.style.objectFit = 'cover';
                      ghost.style.borderRadius = '12px';
                      ghost.style.opacity = '0.35';
                      document.body.appendChild(ghost);
                      // Anchor the cursor near the top of the ghost (rather than
                      // centered) so the ghost trails below the cursor instead of
                      // fully covering whatever drop target the cursor is over —
                      // native drag images always paint above the page, so this is
                      // the only way to keep the target underneath legible.
                      e.dataTransfer.setDragImage(ghost, width / 2, 16);
                      window.setTimeout(() => ghost.remove(), 0);
  
                      setFocusedCardId(null);
                      setDraggedCardId(card.id);
                      setDragOverCardId(null);
                      setIsDraggedAway(false);
                      setIsIncomingHovered(false);
                      setIncomingInsertIndex(null);
                      onCardDragStart?.(card);
                    }
                  : undefined
              }
              onDragEnd={
                interactive
                  ? () => {
                      setDraggedCardId(null);
                      setDragOverCardId(null);
                      if (isDraggedAway) {
                        // The pointer had already left this fan when the drag
                        // ended (e.g. dropped on the draw/discard pile) — the
                        // two hover flags behind isDockOpen may be stuck true
                        // from the same native-drag mouseleave gap noted on
                        // the cleanup effect above, and since the pointer
                        // isn't drifting back over the hand there's no future
                        // mouseenter/mouseleave left to fix it. Force them
                        // closed here. Skipped when isDraggedAway is false
                        // (a plain in-hand reorder, pointer still actually
                        // over the hand) so this doesn't fight a real,
                        // current hover.
                        setIsHoveringHandArea(false);
                        setIsHoveringDockZone(false);
                      }
                      setIsDraggedAway(false);
                      // handleDragOver sets this true during a purely local
                      // reorder drag too (the pointer never leaves this
                      // container), but nothing resets it once that drag
                      // ends — left stale true, it would wrongly satisfy the
                      // incomingCard-preview gate the instant *any* later
                      // drag starts anywhere, even one nowhere near this
                      // hand (e.g. reordering the discard preview).
                      setIsIncomingHovered(false);
                      setIncomingInsertIndex(null);
                      onCardDragEnd?.();
                    }
                  : undefined
              }
              onMouseEnter={interactive ? () => setFocusedCardId(card.id) : undefined}
              onMouseLeave={interactive ? () => setFocusedCardId(null) : undefined}
            />
          );
        })}
        {displayCards.map((card, i) => {
          const offset = i - center;
          const normalized = center > 0 ? offset / center : 0;
          const isIncoming = incomingCard?.id === card.id;
          // A stale hover-focus from before this hand went inert shouldn't
          // still render as expanded, so gate on `interactive` here rather
          // than clearing the state itself.
          const isFocused = interactive && !isIncoming && focusedCardId === card.id;
  
          const positionStyle = {
            '--rotate': `${normalized * MAX_ROTATION_DEG}deg`,
            '--translate-x': `${offset * cardSpacing}px`,
            '--translate-y': `${normalized * normalized * MAX_ARC_RISE_PX}px`,
          } as CSSProperties;
  
          return (
            <div
              key={card.id}
              data-testid="hand-card"
              className={styles.cardSlot}
              style={{ ...positionStyle, zIndex: isFocused ? displayCards.length : i }}
            >
              <div className={isFocused ? `${styles.card} ${styles.focused}` : styles.card}>
                <img src={card.image} alt="" className={styles.cardImage} draggable={false} />
              </div>
            </div>
          );
        })}
      </div>
      {isDockedHand && (
        // A separate, un-transformed sibling (not a child of the dock above)
        // so it stays pinned to the true bottom edge regardless of whether
        // the hand itself is currently lowered or raised.
        <div
          className={styles.dockHitzone}
          onMouseEnter={() => setIsHoveringDockZone(true)}
          onMouseLeave={() => setIsHoveringDockZone(false)}
        />
      )}
    </>
  );
}

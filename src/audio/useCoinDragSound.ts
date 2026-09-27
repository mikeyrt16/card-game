import { useEffect, useRef } from 'react';
import type { PlayerCoins, PlayerSlot } from '../shared/protocol';
import { mapCoins } from './mapCoins';

/** How far a held coin has to actually travel (in the same map-percentage
 *  units its position is stored in) before it counts as being dragged rather
 *  than merely clicked. A dead zone rather than any movement at all, because a
 *  mouse routinely jitters a pixel or two during a click — and a click is
 *  exactly what shift-clicking for the alt face or double-clicking for the
 *  health dialog is. Roughly 8px on a typical screen: well under a coin's own
 *  width, so any deliberate drag clears it immediately. */
const DRAG_THRESHOLD_PERCENT = 0.5;

/** Every coin's held-or-not and where it is — `draggedBy`/`x`/`y` are all
 *  already public and shared, so see `mapCoins` for why this needs no
 *  server-side tally of its own. */
function snapshotCoins(coins: Record<PlayerSlot, PlayerCoins>) {
  return mapCoins(coins, (coin) => ({ held: coin.draggedBy !== null, x: coin.x, y: coin.y }));
}

/** One coin currently being held: where it was when it was grabbed, and
 *  whether it has since travelled far enough to count as a drag. */
interface HeldCoin {
  x: number;
  y: number;
  dragging: boolean;
}

/** Plays a sound when any coin (either player's, main or minion) is actually
 *  dragged, and another when that drag is released — both screens play in step,
 *  since held state and position are fully shared.
 *
 *  Being *held* isn't enough to sound: every press on a coin holds it, so
 *  shift-clicking for the alt face and double-clicking for the health dialog
 *  would each bracket themselves in pick-up/put-down noise. So a hold only
 *  becomes a drag once the coin has moved DRAG_THRESHOLD_PERCENT from where it
 *  was grabbed, and a release only sounds if that happened. A press that never
 *  moves the coin makes no sound at all, at either end.
 *
 *  Tracked per coin against the previous broadcast rather than off a single
 *  count: unlike the darkness/shuffle/deal tallies, a coin can be picked up and
 *  put down any number of times, so there's no ever-climbing number to key off
 *  — a rise would say *some* coin started, never which one.
 *
 *  Joining a game already mid-drag stays silent, the same way the tally sounds
 *  don't replay history on arrival: the first render seeds `previousRef` with
 *  the state as it already is, so nothing reads as new.
 *
 *  `onDragStart`/`onDragEnd` are expected to be stable functions — module-level
 *  ones, not inline closures, which would re-run the effect on every render. */
export function useCoinDragSound(
  coins: Record<PlayerSlot, PlayerCoins>,
  onDragStart: () => void,
  onDragEnd: () => void,
): void {
  const previousRef = useRef(snapshotCoins(coins));
  const heldRef = useRef<Record<string, HeldCoin>>({});

  useEffect(() => {
    const current = snapshotCoins(coins);
    const previous = previousRef.current;
    previousRef.current = current;
    const held = heldRef.current;

    for (const [key, now] of Object.entries(current)) {
      const before = previous[key];
      if (!before) {
        // A coin that wasn't there last time (a newly spawned squirrel) — it
        // has no previous state to have changed from.
        continue;
      }

      if (now.held && !before.held) {
        // Just grabbed. Anchored on where it sat *before* the grab, not where
        // it is now, so a grab and its first move arriving in one batched
        // update still reads as movement rather than resetting the anchor.
        held[key] = { x: before.x, y: before.y, dragging: false };
      }

      const heldCoin = held[key];
      if (now.held && heldCoin && !heldCoin.dragging) {
        const travelled = Math.max(Math.abs(now.x - heldCoin.x), Math.abs(now.y - heldCoin.y));
        if (travelled >= DRAG_THRESHOLD_PERCENT) {
          heldCoin.dragging = true;
          onDragStart();
        }
      }

      if (!now.held && before.held) {
        // Only a hold that actually became a drag gets a put-down — a plain
        // click has nothing to put down.
        if (heldCoin?.dragging) {
          onDragEnd();
        }
        delete held[key];
      }
    }

    // A coin that's gone entirely (minions rebuilt on a character re-pick)
    // can never report its own release, so don't hold its entry forever.
    for (const key of Object.keys(held)) {
      if (!current[key]) {
        delete held[key];
      }
    }
  }, [coins, onDragStart, onDragEnd]);
}

import { useEffect, useRef } from 'react';
import type { PlayerCoins, PlayerSlot } from '../shared/protocol';

const SLOTS: PlayerSlot[] = ['player1', 'player2'];

/** Every coin's own dragged-or-not, keyed so it's stable across renders
 *  regardless of which coin is which — main plus each minion, both players'.
 *  `CoinState.draggedBy` is already public and shared (sent identically to
 *  both clients), so this needs no server-side tally of its own, the same way
 *  `GameStateView.darkness`'s own length drives the darkness-placed sound. */
function flattenDragStates(coins: Record<PlayerSlot, PlayerCoins>): Record<string, boolean> {
  const states: Record<string, boolean> = {};
  for (const slot of SLOTS) {
    const playerCoins = coins[slot];
    states[`${slot}-main`] = playerCoins.main.draggedBy !== null;
    playerCoins.minions.forEach((minion, i) => {
      states[`${slot}-minion-${i}`] = minion.draggedBy !== null;
    });
  }
  return states;
}

/** Plays a sound whenever any coin (either player's, main or minion) starts
 *  or stops being dragged — both screens then play it on the same broadcast,
 *  since dragged state is fully shared. Diffs every coin's own dragged flag
 *  against its previous broadcast rather than watching a single count: unlike
 *  the darkness/shuffle/deal tallies, "is a coin being dragged" can flip back
 *  and forth on the very same coin, so there's no single ever-climbing number
 *  to key off — a rise only tells you *some* coin started, never which one,
 *  so a coin already released could be miscounted as the one that just was.
 *
 *  Joining a game already mid-drag stays silent, the same way the tally
 *  sounds don't replay history on arrival: the first render seeds
 *  `previousRef` with the state as it already is, so nothing reads as new.
 *
 *  `onDragStart`/`onDragEnd` are expected to be stable functions — module-
 *  level ones, not inline closures, which would re-run the effect on every
 *  render. */
export function useCoinDragSound(
  coins: Record<PlayerSlot, PlayerCoins>,
  onDragStart: () => void,
  onDragEnd: () => void,
): void {
  const previousRef = useRef(flattenDragStates(coins));

  useEffect(() => {
    const current = flattenDragStates(coins);
    const previous = previousRef.current;
    previousRef.current = current;
    for (const key of Object.keys(current)) {
      const was = previous[key] ?? false;
      const is = current[key];
      if (!was && is) {
        onDragStart();
      } else if (was && !is) {
        onDragEnd();
      }
    }
  }, [coins, onDragStart, onDragEnd]);
}

import { useEffect, useRef } from 'react';
import type { PlayerCoins, PlayerSlot } from '../shared/protocol';
import { mapCoins } from './mapCoins';

/** Plays a sound whenever any coin (either player's, main or minion) is
 *  flipped to its alternate face or back — both screens play in step, since
 *  `CoinState.altSide` is fully shared (see `mapCoins`), so this needs no
 *  server-side tally of its own.
 *
 *  Either direction counts: turning a coin over is a flip whichever face it
 *  lands on. Like the drag sound, and unlike the darkness/shuffle/deal
 *  tallies, this is diffed per coin rather than off a single count — a coin
 *  can be flipped back and forth any number of times, so there's no
 *  ever-climbing number to key off.
 *
 *  Joining a game where coins are already flipped stays silent: the first
 *  render seeds `previousRef` with the state as it already is, so nothing
 *  reads as a change.
 *
 *  `sound` is expected to be a stable function — a module-level one, not an
 *  inline closure, which would re-run the effect on every render. */
export function useCoinFlipSound(coins: Record<PlayerSlot, PlayerCoins>, sound: () => void): void {
  const previousRef = useRef(mapCoins(coins, (coin) => coin.altSide));

  useEffect(() => {
    const current = mapCoins(coins, (coin) => coin.altSide);
    const previous = previousRef.current;
    previousRef.current = current;

    for (const [key, isAlt] of Object.entries(current)) {
      const was = previous[key];
      // A coin that wasn't there last time (a newly spawned squirrel) has no
      // previous face to have turned from.
      if (was !== undefined && was !== isAlt) {
        sound();
      }
    }
  }, [coins, sound]);
}

import type { CoinState, PlayerCoins, PlayerSlot } from '../shared/protocol';

const SLOTS: PlayerSlot[] = ['player1', 'player2'];

/** Projects every coin on the board — main plus each minion, both players' —
 *  into a record keyed stably across renders, so successive broadcasts can be
 *  compared coin by coin.
 *
 *  Sound hooks use this to watch fields of `CoinState` that are already public
 *  and shared (sent identically to both clients), which is what lets a coin's
 *  own state drive a sound on both screens with no server-side tally of its
 *  own — the same way `GameStateView.darkness`'s length drives the
 *  darkness-placed sound. */
export function mapCoins<T>(
  coins: Record<PlayerSlot, PlayerCoins>,
  project: (coin: CoinState) => T,
): Record<string, T> {
  const projected: Record<string, T> = {};
  for (const slot of SLOTS) {
    const playerCoins = coins[slot];
    projected[`${slot}-main`] = project(playerCoins.main);
    playerCoins.minions.forEach((minion, i) => {
      projected[`${slot}-minion-${i}`] = project(minion);
    });
  }
  return projected;
}

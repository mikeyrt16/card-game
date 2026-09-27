import { useEffect, useRef } from 'react';

/** Plays a sound whenever either player does something, driven off a pair of
 *  server-kept running totals of that something — one for each player. Both
 *  screens then play it on the same broadcast, and only for an action the
 *  server actually carried out (see `PlayerView.cardsDrawn` for why these are
 *  counters rather than one-shot flags).
 *
 *  `theirs` is null while there's no opponent on screen.
 *
 *  `sound` is expected to be a stable function — a module-level one, not an
 *  inline closure, which would re-run the effect on every render. */
export function useTallySound(mine: number, theirs: number | null, sound: () => void): void {
  const previousRef = useRef({ mine, theirs });

  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = { mine, theirs };
    // Only a rise counts, so joining a game already in progress (where these
    // arrive at whatever they'd climbed to) stays silent. The opponent is held
    // to having already been on screen for the same reason: one who reconnects
    // mid-game turns up with their tally intact, which is not a thing they're
    // doing now.
    const theyDid = previous.theirs !== null && theirs !== null && theirs > previous.theirs;
    if (mine > previous.mine || theyDid) {
      sound();
    }
  }, [mine, theirs, sound]);
}

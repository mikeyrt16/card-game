import buttonClickSound from '../assets/sounds/button-click.mp3';
import coinPickUpSound from '../assets/sounds/card-1.mp3';
import cardDealSound from '../assets/sounds/card-3.mp3';
import cardFlipSound from '../assets/sounds/card-flip.mp3';
import cardShuffleSound from '../assets/sounds/card-shuffle.mp3';
import darknessSound from '../assets/sounds/darkness.mp3';
import resurrectSound from '../assets/sounds/resurrect.mp3';
import coinSound from '../assets/sounds/coin.mp3';
import squeakSound1 from '../assets/sounds/squeak-1.mp3';
import squeakSound2 from '../assets/sounds/squeak-2.mp3';
import squeakSound3 from '../assets/sounds/squeak-3.mp3';
import squeakSound4 from '../assets/sounds/squeak-4.mp3';
import squeakSound5 from '../assets/sounds/squeak-5.mp3';

/** A fresh Audio per call rather than one shared element per sound: two of the
 *  same sound close together (both players at once) then overlap instead of the
 *  second cutting the first off mid-play. The file itself is fetched once and
 *  cached, so the extra elements cost nothing.
 *
 *  play() returns a promise that rejects when the browser won't allow audio
 *  yet — a player who hasn't clicked anything on their page has granted no
 *  autoplay permission, which is exactly the opponent's situation at the start
 *  of a game. Nothing to be done about it and nothing worth reporting, so the
 *  rejection is swallowed; an unhandled one would surface as a console error. */
function play(src: string): void {
  void new Audio(src).play().catch(() => {});
}

/** A card being dealt off a draw pile. Played on both players' screens — see
 *  `PlayerView.cardsDrawn`, which is what triggers it. */
export function playCardDealSound(): void {
  play(cardDealSound);
}

/** A board card being turned face up. Played on both players' screens — see
 *  `PlayerView.boardCardsFlipped`, which is what triggers it. */
export function playCardFlipSound(): void {
  play(cardFlipSound);
}

/** Willow's minion being brought back. Played on both players' screens — see
 *  `PlayerView.minionsResurrected`, which is what triggers it. */
export function playResurrectSound(): void {
  play(resurrectSound);
}

/** General UI feedback for menu/navigation buttons — info icons, pile hover
 *  menus, the hamburger menu, character/map selection. Unlike the sounds
 *  above, these aren't game moves the opponent has any stake in, so this is
 *  called directly from each button's own onClick instead of being driven off
 *  a server-synced tally: it plays only for the player who actually clicked. */
export function playButtonClickSound(): void {
  play(buttonClickSound);
}

/** A deck or discard pile being shuffled. Played on both players' screens —
 *  see `PlayerView.pilesShuffled`, which is what triggers it. */
export function playCardShuffleSound(): void {
  play(cardShuffleSound);
}

/** Spike placing a shadow token. Played on both players' screens — see
 *  `GameStateView.darkness`, whose length is what triggers it (already a
 *  single shared, only-grows count, unlike the per-player tallies the other
 *  game-event sounds above key off). */
export function playDarknessSound(): void {
  play(darknessSound);
}

/** A coin being picked up to drag. Played on both players' screens — see
 *  `useCoinDragSound`, which watches `CoinState.draggedBy` (already public
 *  and shared, like `GameStateView.darkness` above) for this transition. */
export function playCoinPickUpSound(): void {
  play(coinPickUpSound);
}

/** A coin being put back down. Played on both players' screens — see
 *  `playCoinPickUpSound`. */
export function playCoinPutDownSound(): void {
  play(coinSound);
}

/** One squeak, picked at random each call. Five recordings rather than one,
 *  purely for variety — any of the five is as valid as any other, so which
 *  plays is chosen fresh on every click rather than cycling or being tracked
 *  across calls. */
const squeakSounds = [squeakSound1, squeakSound2, squeakSound3, squeakSound4, squeakSound5];

/** Squirrel Girl's own player clicking her squirrel button. Local UI feedback
 *  for a button only she can even see, so — like `playButtonClickSound` —
 *  this is called directly from the click rather than driven off a
 *  server-synced tally, and plays only for whoever clicked. */
export function playSquirrelSqueakSound(): void {
  play(squeakSounds[Math.floor(Math.random() * squeakSounds.length)]);
}

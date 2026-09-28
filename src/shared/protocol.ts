/** Wire protocol between the client and the game server. Pure types only —
 *  no browser or Node-specific APIs — so this file can be imported from
 *  both `src/` (Vite/browser) and `server/` (Node). */

export type PlayerSlot = 'player1' | 'player2';

export type PilePosition = 'top' | 'random' | 'bottom';

/** Shared, server-driven screen both players move through together —
 *  advancing (via continueToMapSelect / continueToGame) is a single game-
 *  level transition, not something each player does independently. */
export type GamePhase = 'character-select' | 'map-select' | 'playing';

export type CoinType = 'main' | 'minion';

/** Position is percentage coordinates (0-100) relative to the map image's
 *  own rendered box, so it scales correctly regardless of viewport size.
 *  Public/shared — both players always see every coin's real position. */
export interface CoinState {
  x: number;
  y: number;
  /** Which player currently has this coin "picked up" — null if free.
   *  Only the holder's moveCoin/endDragCoin actions are honored; anyone
   *  else's startDragCoin is rejected while this is set to someone else. */
  draggedBy: PlayerSlot | null;
  /** Starts at the owning character's default for this coin type (see
   *  `CharacterDef.mainHealth`/`minionHealth`) and is edited in-place via
   *  `updateCoinHealth`. At 0 or below, the coin is treated as dead — the
   *  client plays a death animation and it stops being interactable. */
  health: number;
  /** Whether the coin is showing its alternate face. Only meaningful for a
   *  character/coinType with alt art (see `hasCoinAltImage`) — flipped via
   *  `toggleCoinAltSide`, always starting false. */
  altSide: boolean;
  /** By how much this coin's health last changed through `updateCoinHealth`,
   *  and a count of those edits that only ever climbs. Together they drive the
   *  floating number both players see rise off the coin: the delta is what it
   *  reads, and a rise in the count is what makes it a *new* one rather than a
   *  rebroadcast of the same edit — the client keys the element on the count,
   *  so each edit remounts it and replays its animation. `healthEditCount` at
   *  0 means never edited, and nothing is shown. */
  healthEditDelta: number;
  healthEditCount: number;
}

/** One player's coins — a single main coin plus however many minion coins
 *  their chosen character has (see `CharacterDef.minionCount`). Minions are
 *  an array rather than a fixed shape since that count varies by character;
 *  a minion coin is identified by its index into this array. */
export interface PlayerCoins {
  main: CoinState;
  minions: CoinState[];
}

/** A player's mouse position as a percentage (0-100) of their *own*
 *  viewport, so it still lands in the right place on a screen of a
 *  different size. */
export interface CursorPosition {
  x: number;
  y: number;
}

/** A single card instance as it travels over the wire: identifies the card
 *  definition (character + slug) rather than a resolved image URL, since
 *  the server has no knowledge of Vite-bundled asset paths. */
export interface WireCard {
  id: string;
  characterId: string;
  slug: string;
}

/** How many patches of darkness — "shadow tokens", as Spike's control calls
 *  them — Spike gets for the whole game. The server enforces it; the client
 *  reads it to count down the button's label and hide it once they're spent.
 *  Since nothing removes a placed patch, `darkness.length` is exactly how
 *  many have been used. */
export const SHADOW_TOKEN_LIMIT = 3;

/** What Willow's minion comes back on, via `resurrectMinion` — deliberately
 *  well short of the 6 it starts the game with (see CHARACTER_DEFS), so a
 *  resurrection is a reprieve rather than a reset. */
export const RESURRECTED_MINION_HEALTH = 3;

/** How many squirrel minions Squirrel Girl gets for the whole game, one at a
 *  time via `spawnSquirrelMinion`. Unlike every other character, her
 *  CharacterDef.minionCount is 0 — she starts with none, and the server
 *  enforces this as the cap on how many the button can add; the client reads
 *  it to count down the button's label and hide it once she's spawned them
 *  all. Since nothing removes a spawned minion, coins.minions.length is
 *  exactly how many she's used, the same way SHADOW_TOKEN_LIMIT works off
 *  darkness.length. */
export const SQUIRREL_GIRL_MINION_LIMIT = 8;

/** How long the cat dance stays on screen. The server holds off any further
 *  trigger for this long (so it can't be restarted or stacked while it's
 *  playing), and the client runs its show-then-hide animation over exactly the
 *  same span — hence a shared constant rather than a number in each. */
export const CAT_DANCE_MS = 2000;

/** A patch of darkness Spike has put on the map. Positioned in the same
 *  shared percentage-of-the-map frame the coins use, so both players agree
 *  on where it is however their screen is sized or oriented. Permanent once
 *  placed — it can be slid about, but there's no taking it back. */
export interface DarknessView {
  id: string;
  x: number;
  y: number;
}

/** A card lying on the map, dropped there out of someone's hand. Position
 *  is in the same shared percentage-of-the-map frame the coins use, so both
 *  players agree on where it is however their screen is sized or oriented. */
export interface BoardCardView {
  id: string;
  /** Who dropped it — they're the only one who can flip it, and it wears
   *  their card back while face down. */
  owner: PlayerSlot;
  x: number;
  y: number;
  faceUp: boolean;
  /** What the card actually is. Only filled in once it's face up, or if
   *  it's yours — a face-down card of the opponent's is never sent, so it
   *  can't be read off the wire. */
  card: WireCard | null;
}

export interface HelloMessage {
  type: 'hello';
  token: string;
}

/** Actions a client can send once it has an assigned player slot. Every
 *  action only ever mutates the sending player's own board. */
export type GameAction =
  | { type: 'selectCharacter'; characterId: string }
  /** Advances the shared phase to 'map-select' — a no-op unless both
   *  players have already picked a character. Either player can trigger it;
   *  both move forward together since phase is shared, not per-player. */
  | { type: 'continueToMapSelect' }
  /** Sets the shared selected map. The server doesn't know the actual map
   *  catalog (that's Vite-bundled client art) — it just relays whatever id
   *  is sent, so both clients see the same choice as either one changes it. */
  | { type: 'selectMap'; mapId: string }
  /** Advances the shared phase to 'playing' — a no-op unless already in
   *  'map-select'. Either player can trigger it, same as continueToMapSelect. */
  | { type: 'continueToGame' }
  | { type: 'draw' }
  | { type: 'returnFromDiscard' }
  | { type: 'dropOnDrawPile'; cardId: string; position: PilePosition }
  | { type: 'dropOnDiscardPile'; cardId: string; position: PilePosition }
  | { type: 'dropOntoHand'; cardId: string; index: number }
  | { type: 'reorderHand'; order: string[] }
  | { type: 'reorderDiscard'; order: string[] }
  | { type: 'reorderDrawPile'; order: string[] }
  | { type: 'shuffleDiscard' }
  | { type: 'shuffleDrawPile' }
  /** Resets the shared game back to 'character-select' — both players'
   *  characterId, hand, and piles are cleared so they can reselect from
   *  scratch. Either player can trigger it, same as the other phase
   *  transitions; not gated by the current phase. */
  | { type: 'returnToMainMenu' }
  /** Any player can pick up any coin — a no-op if someone else already
   *  has it. coinOwner identifies *whose* coin it is, not who's dragging it.
   *  minionIndex selects which minion coin when coinType is 'minion'
   *  (ignored for 'main', which has exactly one instance); omitted defaults
   *  to index 0. */
  | { type: 'startDragCoin'; coinOwner: PlayerSlot; coinType: CoinType; minionIndex?: number }
  /** Only honored from whoever currently holds the coin (per draggedBy);
   *  sent continuously (rate-limited client-side) while dragging. */
  | { type: 'moveCoin'; coinOwner: PlayerSlot; coinType: CoinType; minionIndex?: number; x: number; y: number }
  | { type: 'endDragCoin'; coinOwner: PlayerSlot; coinType: CoinType; minionIndex?: number }
  /** Any player can edit any coin's health, same as coin dragging — this is
   *  a shared HP tracker, not a per-player stat. */
  | { type: 'updateCoinHealth'; coinOwner: PlayerSlot; coinType: CoinType; minionIndex?: number; health: number }
  /** Flips a coin to its alternate face (or back). Like coin dragging/health,
   *  any player can trigger it — the client only offers the gesture (shift +
   *  click) when that character/coinType actually has alt art. */
  | { type: 'toggleCoinAltSide'; coinOwner: PlayerSlot; coinType: CoinType; minionIndex?: number }
  /** Willow bringing her own fallen minion back, on
   *  `RESURRECTED_MINION_HEALTH`. Only the sender's own minion, only Willow's,
   *  and only one that's actually dead — a no-op otherwise. Distinct from
   *  `updateCoinHealth` (which could express the same change) because it's a
   *  specific move by a specific character, which lets the server hold it to
   *  those rules and lets both clients sound it. */
  | { type: 'resurrectMinion'; minionIndex: number }
  /** Squirrel Girl adding one more squirrel minion, at 1 health, up to
   *  `SQUIRREL_GIRL_MINION_LIMIT` for the whole game. Squirrel Girl's own, so
   *  a no-op from anyone else — and a no-op once she's spawned the limit. */
  | { type: 'spawnSquirrelMinion' }
  /** Shift + C from either player: puts the dancing cat up on both screens.
   *  A no-op while one is already playing — the server holds the gate, so two
   *  players hitting it at once still get the one dance. */
  | { type: 'startCatDance' }
  /** Reports where the sender's own mouse is, so the other player can see
   *  it. Sent throttled to one update per animation frame while the mouse
   *  is moving. */
  | { type: 'moveCursor'; x: number; y: number }
  /** Reports whether the sender has their own hand dock raised, so the
   *  other player's mirrored copy of it can move in step. */
  | { type: 'setHandOpen'; open: boolean }
  /** Puts a card down on the map at x/y (percentages of the map image).
   *  Coming from a hand/pile it lands face down; a card already on the
   *  board is simply moved, keeping whichever way up it was. */
  | { type: 'dropCardOnBoard'; cardId: string; x: number; y: number }
  /** Turns one of the sender's own board cards over. Nobody can flip a
   *  card they didn't put down. */
  | { type: 'flipBoardCard'; cardId: string }
  /** Reports where the card the sender is dragging currently is, so the
   *  other player can watch it move. Throttled with the cursor it travels
   *  with, and sent from the same pointer events, so the two stay in step. */
  | { type: 'dragCardTo'; cardId: string; x: number; y: number }
  | { type: 'endCardDrag' }
  /** Deliberately reveals the sender's whole hand to their opponent, who
   *  gets a read-only look at it. A snapshot taken at this moment, not a
   *  live feed — drawing a card afterwards doesn't add it to what they've
   *  already been shown. */
  | { type: 'showHandToOpponent' }
  /** Dismisses the hand the sender was shown (their own view only). */
  | { type: 'clearRevealedHand' }
  /** Drops a fresh patch of darkness on the middle of the map. Spike's
   *  own, so a no-op from anyone else — and a no-op once he's placed all
   *  `SHADOW_TOKEN_LIMIT` of them. */
  | { type: 'addDarkness' }
  /** Darkness is shared furniture once placed: like a coin, either player
   *  can slide it about. */
  | { type: 'moveDarkness'; id: string; x: number; y: number };

export type ClientAction = HelloMessage | GameAction;

/** A card a player currently has picked up, for the other player to watch
 *  move. Position is the card's centre as a percentage of the dragging
 *  player's own viewport — the same frame the cursor uses, so it stays
 *  glued to their pointer on a screen of any size. */
export interface DraggedCardView {
  /** Which card it is. Safe to send even for a card out of a hand: it's an
   *  opaque id that reveals nothing on its own, and it's what lets a card
   *  picked up off the board be hidden there while it's being carried —
   *  otherwise the original and the floating copy show at once. */
  cardId: string;
  x: number;
  y: number;
  /** Only filled in when the card's face is already public knowledge: one
   *  lying face up on the board, or one out of a discard pile. Anything out
   *  of a hand or draw pile stays null and is drawn as a back, so picking a
   *  card up can't leak what it is. */
  card: WireCard | null;
}

export interface PlayerView {
  characterId: string | null;
  connected: boolean;
  drawPileCount: number;
  /** Discard piles are public information. */
  discardPile: WireCard[];
  /** This player's own mouse position, or null until they've moved it (and
   *  again once they disconnect). Public — each player draws the other's. */
  cursor: CursorPosition | null;
  /** Whether this player has their hand dock raised. Public, so the other
   *  player's mirrored view of that hand can match it (still face down —
   *  only the count is ever sent, never the cards). */
  handOpen: boolean;
  /** The card this player is currently dragging, or null. */
  draggedCard: DraggedCardView | null;
  /** How many cards this player has dealt themselves off their draw pile all
   *  game — only ever climbs. Public, and sent for both players, because the
   *  deal makes a sound on *both* screens: each client watches this for a
   *  rise and plays it. A counter rather than a one-shot "a card was dealt"
   *  flag since state is broadcast constantly (every cursor move echoes back)
   *  — a flag would have to be cleared on some later broadcast, and would
   *  either be missed or replayed. It also means the sound tracks what the
   *  server actually did: drawing on an empty pile is a no-op and doesn't
   *  move this, so nobody hears a card that was never dealt. */
  cardsDrawn: number;
  /** How many of this player's board cards they've turned face up all game.
   *  Only ever climbs — a card can't be re-hidden — and drives the flip sound
   *  on both screens, exactly as `cardsDrawn` does for the deal. */
  boardCardsFlipped: number;
  /** How many times this player has brought a minion back (Willow only, so
   *  it stays 0 for everyone else). Drives the resurrect sound on both
   *  screens, exactly as `cardsDrawn` does for the deal. */
  minionsResurrected: number;
  /** How many times this player has shuffled either of their own piles.
   *  Drives the shuffle sound on both screens, exactly as `cardsDrawn` does
   *  for the deal — one counter for both piles, since both play the same
   *  sound. */
  pilesShuffled: number;
  /** How many cards this player has placed onto the board or into their
   *  discard pile, combined into one counter since both play the same sound
   *  — exactly as `cardsDrawn` does for the deal. Only a card actually newly
   *  landing counts: sliding an existing board card around doesn't move
   *  this, nor does a drop the server otherwise rejected. */
  cardsPlaced: number;
  /** How many coin health edits this player has made that raised the health,
   *  and how many that lowered it — the two drive the heal and hit sounds on
   *  both screens, exactly as `cardsDrawn` does for the deal. Counted against
   *  the player who made the edit, not the coin's owner, since either player
   *  can edit any coin. Only edits through the health dialog move these: an
   *  edit to the same value is no change, and a resurrect has its own sound. */
  coinsHealed: number;
  coinsHit: number;
}

export interface GameStateView {
  phase: GamePhase;
  /** Which slot the receiving connection is — coins are keyed by slot and
   *  fully public (unlike hand/drawPile), so the client needs this to tell
   *  "my coin" apart from "opponent's coin" and to know whether it's the
   *  one currently holding a given coin. */
  mySlot: PlayerSlot;
  /** Shared between both players — set via selectMap, null until either
   *  player has picked one. */
  selectedMapId: string | null;
  /** Fully public/shared — both players always see every coin's real
   *  position and drag state, identically. */
  coins: Record<PlayerSlot, PlayerCoins>;
  /** Every card lying face down or face up on the map, both players'. */
  boardCards: BoardCardView[];
  /** Spike's patches of darkness, shared and public like the coins. */
  darkness: DarknessView[];
  /** How many cat dances have been set off all game (see `startCatDance`).
   *  Only ever climbs, and a rise is what puts the cat on screen and plays the
   *  meow — a counter rather than an "is it playing" flag for the same reason
   *  `PlayerView.cardsDrawn` is one: state is rebroadcast constantly, so a flag
   *  would have to be cleared and would end up missed or replayed. How long it
   *  then stays up is the client's own business (see `CAT_DANCE_MS`). */
  catDanceCount: number;
  /** The receiving player's own board — hand and the draw pile's actual
   *  contents are only ever sent to their owner, for a deliberate "look
   *  through your deck" view; the opponent's stay hidden as counts. */
  /** `revealedHand` is the opponent's hand as they last chose to show it —
   *  empty unless they did. Lives here, on the receiving player's own
   *  branch, because it's the one case where someone else's hand is meant
   *  to be readable, and only by them. */
  me: PlayerView & { hand: WireCard[]; drawPile: WireCard[]; revealedHand: WireCard[] };
  /** null until the opponent has connected at least once. Hand is hidden,
   *  exposed only as a count. */
  opponent: (PlayerView & { handCount: number }) | null;
}

export type ServerMessage = { type: 'state'; state: GameStateView } | { type: 'error'; message: string };

/** Wire protocol between the client and the game server. Pure types only —
 *  no browser or Node-specific APIs — so this file can be imported from
 *  both `src/` (Vite/browser) and `server/` (Node). */

export type PlayerSlot = 'player1' | 'player2';

export type PilePosition = 'top' | 'random' | 'bottom';

/** Shared, server-driven screen both players move through together —
 *  advancing (via continueToMapSelect / continueToGame) is a single game-
 *  level transition, not something each player does independently. */
export type GamePhase = 'character-select' | 'map-select' | 'playing';

/** A single card instance as it travels over the wire: identifies the card
 *  definition (character + slug) rather than a resolved image URL, since
 *  the server has no knowledge of Vite-bundled asset paths. */
export interface WireCard {
  id: string;
  characterId: string;
  slug: string;
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
  | { type: 'playCard'; cardId: string }
  | { type: 'removePlayedCard' }
  | { type: 'dropOnDrawPile'; cardId: string; position: PilePosition }
  | { type: 'dropOnDiscardPile'; cardId: string; position: PilePosition }
  | { type: 'dropOntoHand'; cardId: string; index: number }
  | { type: 'reorderHand'; order: string[] }
  | { type: 'reorderDiscard'; order: string[] }
  | { type: 'reorderDrawPile'; order: string[] }
  | { type: 'shuffleDiscard' }
  | { type: 'shuffleDrawPile' };

export type ClientAction = HelloMessage | GameAction;

export interface PlayerView {
  characterId: string | null;
  connected: boolean;
  drawPileCount: number;
  /** Discard piles are public information. */
  discardPile: WireCard[];
  playedCard: WireCard | null;
}

export interface GameStateView {
  phase: GamePhase;
  /** Shared between both players — set via selectMap, null until either
   *  player has picked one. */
  selectedMapId: string | null;
  /** The receiving player's own board — hand and the draw pile's actual
   *  contents are only ever sent to their owner, for a deliberate "look
   *  through your deck" view; the opponent's stay hidden as counts. */
  me: PlayerView & { hand: WireCard[]; drawPile: WireCard[] };
  /** null until the opponent has connected at least once. Hand is hidden,
   *  exposed only as a count. */
  opponent: (PlayerView & { handCount: number }) | null;
}

export type ServerMessage = { type: 'state'; state: GameStateView } | { type: 'error'; message: string };
